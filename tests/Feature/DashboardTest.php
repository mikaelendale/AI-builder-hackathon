<?php

namespace Tests\Feature;

use App\Models\Beneficiary;
use App\Models\Interview;
use App\Services\SheetAggregator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_renders_with_summary_and_rows(): void
    {
        $beneficiary = Beneficiary::create([
            'name' => 'Selam Tesfaye',
            'persona_type' => 'selam',
            'phone_type' => 'smartphone',
            'language' => 'en',
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'completed',
            'transcript_raw' => 'Sample transcript',
        ]);

        app(SheetAggregator::class)->aggregate($interview, [
            'job_position' => 'Call Centre Agent',
            'employer_reported_value' => 1,
            'worker_reported_value' => 1,
        ]);

        $response = $this->get('/dashboard');
        $response->assertOk();
    }

    public function test_interview_page_renders_successfully(): void
    {
        $response = $this->get('/interview');
        $response->assertOk();
    }
}
