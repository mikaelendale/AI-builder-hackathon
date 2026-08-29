<?php

namespace Tests\Feature;

use App\Models\Beneficiary;
use App\Models\Interview;
use App\Services\ClauseRuleEngine;
use App\Services\SheetAggregator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClauseVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_selam_clean_persona_resolves_all_clauses_met(): void
    {
        $beneficiary = Beneficiary::create([
            'name' => 'Selam',
            'persona_type' => 'selam',
            'phone_type' => 'smartphone',
            'language' => 'en',
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'consent_given' => true,
        ]);

        $selamTranscript = "Hello. My name is Selam, I am 22 years old. I was placed in a call centre six months ago. I work 40 hours per week and I earn 6500 ETB per month. I am free to join the workers association, there is no discrimination, no forced labour, and I started working when I was an adult.";

        $response = $this->postJson("/interviews/{$interview->id}/transcript", [
            'transcript' => $selamTranscript,
        ]);

        $response->assertOk();
        $data = $response->json();

        $this->assertFalse($data['stopped']);
        $this->assertEquals('met', $data['verdicts']['age_15_plus']['status']);
        $this->assertEquals('met', $data['verdicts']['hours_threshold']['status']);
        $this->assertEquals('met', $data['verdicts']['no_child_labor']['status']);
        $this->assertEquals('met', $data['verdicts']['no_forced_labor']['status']);
        $this->assertEquals('met', $data['verdicts']['no_discrimination']['status']);
        $this->assertEquals('met', $data['verdicts']['freedom_of_association']['status']);
    }

    public function test_abel_ambiguous_case_triggers_unclear_and_targeted_follow_up(): void
    {
        $beneficiary = Beneficiary::create([
            'name' => 'Abel',
            'persona_type' => 'abel',
            'phone_type' => 'feature_phone',
            'language' => 'am',
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'consent_given' => true,
        ]);

        $abelAmbiguousTranscript = "My name is Abel, I am 19 years old. I work at the construction site outside Adama. I get paid in cash daily. I started working after the rains, maybe 5 or 7 months ago, whenever work is available.";

        $response = $this->postJson("/interviews/{$interview->id}/transcript", [
            'transcript' => $abelAmbiguousTranscript,
        ]);

        $response->assertOk();
        $data = $response->json();

        $this->assertFalse($data['stopped']);
        $this->assertEquals('met', $data['verdicts']['age_15_plus']['status']);
        $this->assertEquals('unclear', $data['verdicts']['hours_threshold']['status']);
        $this->assertNotEmpty($data['follow_ups']);
        $this->assertEquals('hours_threshold', $data['follow_ups'][0]['clause_key']);
    }

    public function test_under_15_hard_case_stops_interview_immediately(): void
    {
        $beneficiary = Beneficiary::create([
            'name' => 'Minor Case',
            'persona_type' => 'synthetic',
            'phone_type' => 'feature_phone',
            'language' => 'en',
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'consent_given' => true,
        ]);

        $minorTranscript = "Hello, I am 13 years old. I work helping at the market stand.";

        $response = $this->postJson("/interviews/{$interview->id}/transcript", [
            'transcript' => $minorTranscript,
        ]);

        $response->assertOk();
        $data = $response->json();

        $this->assertTrue($data['stopped']);
        $this->assertEquals('under_15', $data['reason']);
        $this->assertDatabaseHas('hard_case_flags', [
            'interview_id' => $interview->id,
            'type' => 'under_15',
        ]);
        $this->assertDatabaseHas('interviews', [
            'id' => $interview->id,
            'status' => 'stopped_hard_case',
        ]);
    }

    public function test_sheet_aggregator_flags_discrepancies(): void
    {
        $beneficiary = Beneficiary::create([
            'name' => 'Abel',
            'persona_type' => 'abel',
            'phone_type' => 'feature_phone',
            'language' => 'am',
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'consent_given' => true,
        ]);

        // Only 1 clause met, others unclear
        $interview->clauseAssessments()->create([
            'clause_key' => 'age_15_plus',
            'status' => 'met',
            'confidence' => 0.9,
        ]);
        $interview->clauseAssessments()->create([
            'clause_key' => 'hours_threshold',
            'status' => 'unclear',
            'confidence' => 0.45,
        ]);

        $aggregator = app(SheetAggregator::class);
        $sheetRow = $aggregator->aggregate($interview, [
            'job_position' => 'Construction Daily Labourer',
            'employer_reported_value' => 1, // Employer claims good job
        ]);

        $this->assertFalse($sheetRow->is_good_job);
        $this->assertTrue($sheetRow->discrepancy_flag);
    }
}
