<?php

namespace Tests\Feature;

use App\Ai\Agents\EmploymentFactsAgent;
use App\Ai\Agents\ExtractionVerifierAgent;
use App\Ai\Agents\InterviewSupervisorAgent;
use App\Ai\Agents\RightsProtectionsAgent;
use App\Models\Beneficiary;
use App\Models\ClauseAssessment;
use App\Models\Interview;
use App\Services\SubAgentResultMerger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Ai\Contracts\CanActAsTool;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Contracts\HasTools;
use Tests\TestCase;

class MultiAgentHarnessTest extends TestCase
{
    use RefreshDatabase;

    public function test_specialist_subagents_implement_required_contracts_and_tools(): void
    {
        $factsAgent = new EmploymentFactsAgent;
        $this->assertInstanceOf(CanActAsTool::class, $factsAgent);
        $this->assertInstanceOf(HasStructuredOutput::class, $factsAgent);
        $this->assertEquals('employment_facts_extractor', $factsAgent->name());

        $rightsAgent = new RightsProtectionsAgent;
        $this->assertInstanceOf(CanActAsTool::class, $rightsAgent);
        $this->assertInstanceOf(HasStructuredOutput::class, $rightsAgent);
        $this->assertEquals('rights_protections_extractor', $rightsAgent->name());

        $supervisor = new InterviewSupervisorAgent;
        $this->assertInstanceOf(HasTools::class, $supervisor);
        $tools = $supervisor->tools();
        $this->assertCount(2, $tools);

        $verifier = new ExtractionVerifierAgent;
        $this->assertInstanceOf(HasStructuredOutput::class, $verifier);
    }

    public function test_subagent_result_merger_combines_factual_and_rights_signals(): void
    {
        $merger = new SubAgentResultMerger;
        $facts = [
            'age' => ['raw_signal' => 'Age 22', 'evidence_quote' => 'I am 22 years old', 'confidence' => 0.95],
            'hours_and_duration' => ['raw_signal' => '40 hours per week', 'evidence_quote' => '40 hours per week', 'confidence' => 0.90],
            'wage' => ['raw_signal' => '6500 ETB', 'evidence_quote' => '6500 ETB', 'confidence' => 0.95],
        ];
        $rights = [
            'child_labor' => ['raw_signal' => 'No child labor', 'evidence_quote' => null, 'confidence' => 0.9],
            'forced_labor' => ['raw_signal' => 'Voluntary employment', 'evidence_quote' => null, 'confidence' => 0.9],
            'discrimination' => ['raw_signal' => 'Fair treatment', 'evidence_quote' => null, 'confidence' => 0.9],
            'freedom_of_association' => ['raw_signal' => 'Union allowed', 'evidence_quote' => null, 'confidence' => 0.9],
        ];

        $merged = $merger->merge($facts, $rights);

        $this->assertArrayHasKey('age', $merged);
        $this->assertArrayHasKey('hours_and_duration', $merged);
        $this->assertArrayHasKey('wage', $merged);
        $this->assertArrayHasKey('child_labor', $merged);
        $this->assertArrayHasKey('forced_labor', $merged);
        $this->assertArrayHasKey('discrimination', $merged);
        $this->assertArrayHasKey('freedom_of_association', $merged);
        $this->assertEquals(0.95, $merged['age']['confidence']);
        $this->assertEquals('40 hours per week', $merged['hours_and_duration']['raw_signal']);
    }

    public function test_verifier_critic_reflection_stores_verifier_flags_on_assessments(): void
    {
        $beneficiary = Beneficiary::create([
            'name' => 'Selam Test',
            'persona_type' => 'selam',
            'phone_type' => 'smartphone',
            'language' => 'en',
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'consent_given' => true,
        ]);

        $transcript = "I am 22 years old. I work 40 hours per week. I earn 6500 ETB per month. No discrimination, no forced labour, free to join unions.";

        $response = $this->postJson("/interviews/{$interview->id}/transcript", [
            'transcript' => $transcript,
        ]);

        $response->assertOk();
        $data = $response->json();

        $this->assertArrayHasKey('verdicts', $data);
        $this->assertArrayHasKey('verifier_flag', $data['verdicts']['age_15_plus']);
        $this->assertFalse($data['verdicts']['age_15_plus']['verifier_flag']);

        // Verify database persistence of verifier fields
        $assessments = ClauseAssessment::where('interview_id', $interview->id)->get();
        $this->assertCount(7, $assessments);
        foreach ($assessments as $ca) {
            $this->assertNotNull($ca->verifier_flag);
            $this->assertFalse($ca->verifier_flag);
        }
    }
}
