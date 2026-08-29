<?php

namespace Tests\Feature;

use App\Models\Beneficiary;
use App\Models\ContinuityCheckpoint;
use App\Models\EmployerConfirmation;
use App\Models\Interview;
use App\Models\SheetRow;
use App\Services\AmharicTransliterator;
use App\Services\ClauseRuleEngine;
use App\Services\EvidencePackGenerator;
use App\Services\SheetAggregator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ImprovementFeaturesTest extends TestCase
{
    use RefreshDatabase;

    public function test_bilateral_reconciliation_engine_rules(): void
    {
        $engine = new ClauseRuleEngine();

        // Case 1: No employer confirmation received -> worker_only
        $r1 = $engine->reconcile(['status' => 'met'], null, null);
        $this->assertEquals('met', $r1['final_status']);
        $this->assertEquals('worker_only', $r1['source']);

        // Case 2: Worker was unclear, employer confirms clean -> employer_only
        $r2 = $engine->reconcile(['status' => 'unclear'], 40, 6);
        $this->assertEquals('met', $r2['final_status']);
        $this->assertEquals('employer_only', $r2['source']);

        // Case 3: Both agree -> both_agree
        $r3 = $engine->reconcile(['status' => 'met'], 40, 6);
        $this->assertEquals('met', $r3['final_status']);
        $this->assertEquals('both_agree', $r3['source']);

        // Case 4: Both disagree -> both_disagree
        $r4 = $engine->reconcile(['status' => 'met'], 10, 2);
        $this->assertEquals('unclear', $r4['final_status']);
        $this->assertEquals('both_disagree', $r4['source']);
    }

    public function test_employer_confirmation_flow_and_reconciliation(): void
    {
        $beneficiary = Beneficiary::create([
            'name' => 'Abel Kebede',
            'persona_type' => 'abel',
            'phone_type' => 'feature_phone',
            'language' => 'am',
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'completed',
            'transcript_raw' => 'Ambiguous interview',
            'consent_given' => true,
        ]);

        $interview->clauseAssessments()->create([
            'clause_key' => 'hours_threshold',
            'status' => 'unclear',
            'confidence' => 0.45,
        ]);

        $token = Str::random(64);
        $confirmation = EmployerConfirmation::create([
            'interview_id' => $interview->id,
            'confirmation_token' => $token,
            'status' => 'pending',
            'expires_at' => now()->addHours(72),
        ]);

        // 1. Visit confirmation link
        $getRes = $this->get("/employer/confirm/{$token}");
        $getRes->assertOk();

        // 2. Submit employer confirmation (40 hrs/wk, 6 months)
        $postRes = $this->postJson("/employer/confirm/{$token}", [
            'status' => 'confirmed',
            'employer_reported_hours_per_week' => 40,
            'employer_reported_months_employed' => 6,
            'employer_note' => 'Confirmed full-time employment.',
        ]);

        $postRes->assertOk();
        $this->assertDatabaseHas('employer_confirmations', [
            'confirmation_token' => $token,
            'status' => 'confirmed',
            'employer_reported_hours_per_week' => 40,
        ]);

        $this->assertDatabaseHas('sheet_rows', [
            'interview_id' => $interview->id,
            'confirmation_source' => 'employer_only',
        ]);
    }

    public function test_signed_evidence_pack_generation_and_export(): void
    {
        $beneficiary = Beneficiary::create([
            'name' => 'Tigist Alemu',
            'persona_type' => 'synthetic',
            'phone_type' => 'smartphone',
            'language' => 'en',
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'completed',
            'transcript_raw' => 'Clean transcript',
            'consent_given' => true,
        ]);

        app(SheetAggregator::class)->aggregate($interview, [
            'job_position' => 'Garment Operator',
            'gender' => 'Female',
            'age_band' => '15-24',
            'employer_reported_value' => 1,
            'worker_reported_value' => 1,
        ]);

        // Test EvidencePackGenerator service
        $generator = new EvidencePackGenerator();
        $pack = $generator->generate();

        $this->assertArrayHasKey('summary', $pack);
        $this->assertArrayHasKey('records', $pack);
        $this->assertArrayHasKey('final_chain_hash', $pack);
        $this->assertArrayHasKey('signature', $pack);
        $this->assertEquals('HMAC-SHA256', $pack['signature_algorithm']);

        // Check each record has a chain_hash
        $this->assertNotEmpty($pack['records']);
        $this->assertArrayHasKey('chain_hash', $pack['records'][0]);

        // Test Controller export route
        $exportRes = $this->get('/dashboard/evidence-pack');
        $exportRes->assertOk();
        $exportRes->assertHeader('Content-Disposition', 'attachment; filename="evidence-pack.json"');
    }

    public function test_longitudinal_continuity_evaluation(): void
    {
        $engine = new ClauseRuleEngine();

        // 1. Single checkpoint -> unclear
        $cp1 = new ContinuityCheckpoint(['still_employed_same_role' => true, 'cumulative_weeks_employed' => 12]);
        $eval1 = $engine->evaluateContinuity(collect([$cp1]));
        $this->assertEquals('unclear', $eval1['status']);

        // 2. Multi checkpoints exceeding 26 weeks -> met
        $cp2 = new ContinuityCheckpoint(['still_employed_same_role' => true, 'cumulative_weeks_employed' => 26]);
        $eval2 = $engine->evaluateContinuity(collect([$cp1, $cp2]));
        $this->assertEquals('met', $eval2['status']);

        // 3. Discontinued checkpoint -> not_met
        $cp3 = new ContinuityCheckpoint(['still_employed_same_role' => false, 'cumulative_weeks_employed' => 12]);
        $eval3 = $engine->evaluateContinuity(collect([$cp1, $cp3]));
        $this->assertEquals('not_met', $eval3['status']);
    }

    public function test_amharic_transliterator_maps_known_phrases(): void
    {
        $transliterator = new AmharicTransliterator();

        $fidel = 'እባክዎን ትክክለኛ ዕድሜዎ ስንት እንደሆነ በዓመት ሊነግሩኝ ይችላሉ?';
        $latin = $transliterator->transliterate($fidel);

        $this->assertStringContainsString('Ebakwon tikikilinya edmewo', $latin);
    }

    public function test_feature_phone_ivr_demo_route_renders(): void
    {
        $response = $this->get('/demo/feature-phone');
        $response->assertOk();
    }
}
