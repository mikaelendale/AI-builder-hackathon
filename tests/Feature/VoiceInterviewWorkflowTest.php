<?php

namespace Tests\Feature;

use App\Models\Beneficiary;
use App\Models\ClauseAssessment;
use App\Models\HardCaseFlag;
use App\Models\Interview;
use App\Services\ClauseRuleEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VoiceInterviewWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_selam_voice_converse_evaluates_all_7_statutory_clauses_met(): void
    {
        $beneficiary = Beneficiary::create([
            'name' => 'Selam Tesfaye',
            'persona_type' => 'selam',
            'phone_type' => 'smartphone',
            'language' => 'en',
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'consent_given' => true,
        ]);

        $selamTurn = "Hello, my name is Selam. I am 22 years old. I work as a call centre agent 40 hours per week and I am paid 6500 ETB monthly with pension deducted. I am free to join any union, face no discrimination or harassment, work completely voluntary, and started working as an adult.";

        $response = $this->postJson("/interviews/{$interview->id}/converse", [
            'transcript' => $selamTurn,
            'language' => 'en',
        ]);

        $response->assertOk();
        $data = $response->json();

        $this->assertFalse($data['stopped']);
        $this->assertTrue($data['is_complete']);
        $this->assertEquals('met', $data['verdicts']['age_15_plus']['status']);
        $this->assertEquals('met', $data['verdicts']['hours_threshold']['status']);
        $this->assertEquals('met', $data['verdicts']['min_wage']['status']);
        $this->assertEquals('met', $data['verdicts']['no_child_labor']['status']);
        $this->assertEquals('met', $data['verdicts']['no_forced_labor']['status']);
        $this->assertEquals('met', $data['verdicts']['no_discrimination']['status']);
        $this->assertEquals('met', $data['verdicts']['freedom_of_association']['status']);

        // Check database persistence in clause_assessments
        $this->assertDatabaseCount('clause_assessments', 7);
        $this->assertDatabaseHas('clause_assessments', [
            'interview_id' => $interview->id,
            'clause_key' => 'min_wage',
            'status' => 'met',
        ]);
    }

    public function test_abel_amharic_ambiguous_hours_triggers_unclear_and_generates_follow_up(): void
    {
        $beneficiary = Beneficiary::create([
            'name' => 'Abel Kebede',
            'persona_type' => 'abel',
            'phone_type' => 'feature_phone',
            'language' => 'am',
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'consent_given' => true,
        ]);

        $abelInitialTurn = "ስሜ አቤል ከበደ ይባላል። ዕድሜዬ 19 ዓመት ነው። በአዳማ ከተማ አቅራቢያ በኮንስትራክሽን ቦታ ላይ በቀን ሠራተኛነት እሠራለሁ። ክፍያዬን በጥሬ ገንዘብ ነው የማገኘው። ሥራውን የጀመርኩት ከክረምቱ በኋላ ነው፣ አምስት ወይም ሰባት ወር ሊሆን ይችላል፣ ሥራ በተገኘበት ቀን ብቻ ነው የምሠራው።";

        $response = $this->postJson("/interviews/{$interview->id}/converse", [
            'transcript' => $abelInitialTurn,
            'language' => 'am',
        ]);

        $response->assertOk();
        $data = $response->json();

        $this->assertFalse($data['stopped']);
        $this->assertFalse($data['is_complete']);
        $this->assertEquals('met', $data['verdicts']['age_15_plus']['status']);
        $this->assertEquals('unclear', $data['verdicts']['hours_threshold']['status']);
        $this->assertNotEmpty($data['follow_ups']);
        $this->assertEquals('hours_threshold', $data['follow_ups'][0]['clause_key']);
    }

    public function test_abel_answering_follow_up_probe_resolves_hours_threshold_to_met(): void
    {
        $beneficiary = Beneficiary::create([
            'name' => 'Abel Kebede',
            'persona_type' => 'abel',
            'phone_type' => 'feature_phone',
            'language' => 'am',
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'consent_given' => true,
        ]);

        // Turn 1: Ambiguous duration
        $this->postJson("/interviews/{$interview->id}/converse", [
            'transcript' => "ስሜ አቤል ከበደ ይባላል። ዕድሜዬ 19 ዓመት ነው። ሥራ የጀመርኩት ከክረምቱ በኋላ ነው።",
            'language' => 'am',
        ]);

        // Turn 2: Follow-up answer with exact 35 hours/week
        $followUpRes = $this->postJson("/interviews/{$interview->id}/converse", [
            'transcript' => "በተለመደው ሳምንት ውስጥ 35 ሰዓት እሠራለሁ፣ እና ከጀመርኩ 6 ወር ሆኖኛል።",
            'language' => 'am',
        ]);

        $followUpRes->assertOk();
        $data = $followUpRes->json();

        $this->assertEquals('met', $data['verdicts']['hours_threshold']['status']);
        $this->assertDatabaseHas('clause_assessments', [
            'interview_id' => $interview->id,
            'clause_key' => 'hours_threshold',
            'status' => 'met',
        ]);
    }

    public function test_minor_under_15_triggers_hard_stop_and_terminates_interview(): void
    {
        $beneficiary = Beneficiary::create([
            'name' => 'Yordanos',
            'persona_type' => 'synthetic',
            'phone_type' => 'smartphone',
            'language' => 'en',
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'consent_given' => true,
        ]);

        $minorTurn = "Hi, I am Yordanos and I am 13 years old. I work packaging cartons after school.";

        $response = $this->postJson("/interviews/{$interview->id}/converse", [
            'transcript' => $minorTurn,
            'language' => 'en',
        ]);

        $response->assertOk();
        $data = $response->json();

        $this->assertTrue($data['stopped']);
        $this->assertDatabaseHas('hard_case_flags', [
            'interview_id' => $interview->id,
            'type' => 'under_15',
        ]);
        $this->assertDatabaseHas('interviews', [
            'id' => $interview->id,
            'status' => 'stopped_hard_case',
        ]);
    }

    public function test_interview_complete_persists_to_sheet_rows(): void
    {
        $beneficiary = Beneficiary::create([
            'name' => 'Selam Tesfaye',
            'persona_type' => 'selam',
            'phone_type' => 'smartphone',
            'language' => 'en',
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'consent_given' => true,
        ]);

        // Seed 7 met clauses
        $clauses = ['age_15_plus', 'hours_threshold', 'min_wage', 'no_child_labor', 'no_forced_labor', 'no_discrimination', 'freedom_of_association'];
        foreach ($clauses as $c) {
            ClauseAssessment::create([
                'interview_id' => $interview->id,
                'clause_key' => $c,
                'status' => 'met',
                'confidence' => 0.95,
            ]);
        }

        $response = $this->postJson("/interviews/{$interview->id}/complete", [
            'job_position' => 'Call Centre Agent',
            'monthly_salary_etb' => 6500,
            'employer_reported_value' => 1,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('interviews', [
            'id' => $interview->id,
            'status' => 'completed',
        ]);
        $this->assertDatabaseHas('sheet_rows', [
            'interview_id' => $interview->id,
            'job_position' => 'Call Centre Agent',
            'is_good_job' => true,
            'discrepancy_flag' => false,
        ]);
    }

    public function test_clause_rule_engine_deterministic_evaluations(): void
    {
        $engine = app(ClauseRuleEngine::class);
        $interview = new Interview();

        // 1. Age thresholds
        $resAdult = $engine->evaluate($interview, [
            'age' => ['raw_signal' => 'Beneficiary stated age 22', 'confidence' => 0.9],
            'hours_and_duration' => ['raw_signal' => 'Works 40 hours per week', 'confidence' => 0.9],
            'wage' => ['raw_signal' => 'Paid 6500 ETB', 'confidence' => 0.9],
            'child_labor' => ['raw_signal' => 'No child labour indicators found', 'confidence' => 0.9],
            'forced_labor' => ['raw_signal' => 'Voluntary employment with freedom of movement', 'confidence' => 0.9],
            'discrimination' => ['raw_signal' => 'Equal and fair treatment reported', 'confidence' => 0.9],
            'freedom_of_association' => ['raw_signal' => 'Free to join workers group or union', 'confidence' => 0.9],
        ]);
        $this->assertEquals('met', $resAdult['age_15_plus']['status']);
        $this->assertEquals('met', $resAdult['hours_threshold']['status']);
        $this->assertEquals('met', $resAdult['min_wage']['status']);

        // 2. Under-15 minor threshold
        $resMinor = $engine->evaluate($interview, [
            'age' => ['raw_signal' => 'Beneficiary stated age 13', 'confidence' => 0.9],
            'hours_and_duration' => ['raw_signal' => 'Works 10 hours', 'confidence' => 0.9],
            'wage' => ['raw_signal' => 'Paid cash', 'confidence' => 0.4],
            'child_labor' => ['raw_signal' => 'Possible minor start', 'confidence' => 0.9],
            'forced_labor' => ['raw_signal' => 'Voluntary', 'confidence' => 0.9],
            'discrimination' => ['raw_signal' => 'Equal', 'confidence' => 0.9],
            'freedom_of_association' => ['raw_signal' => 'Free', 'confidence' => 0.9],
        ]);
        $this->assertEquals('not_met', $resMinor['age_15_plus']['status']);
        $this->assertEquals('not_met', $resMinor['no_child_labor']['status']);

        // 3. Ambiguous hours threshold
        $resAmbiguous = $engine->evaluate($interview, [
            'age' => ['raw_signal' => 'Beneficiary stated age 19', 'confidence' => 0.9],
            'hours_and_duration' => ['raw_signal' => 'Uncertain months', 'confidence' => 0.4],
            'wage' => ['raw_signal' => 'Paid cash', 'confidence' => 0.4],
            'child_labor' => ['raw_signal' => 'No child labour', 'confidence' => 0.9],
            'forced_labor' => ['raw_signal' => 'Voluntary', 'confidence' => 0.9],
            'discrimination' => ['raw_signal' => 'Equal', 'confidence' => 0.9],
            'freedom_of_association' => ['raw_signal' => 'Free', 'confidence' => 0.9],
        ]);
        $this->assertEquals('unclear', $resAmbiguous['hours_threshold']['status']);
        $this->assertEquals('unclear', $resAmbiguous['min_wage']['status']);
    }
}
