<?php

namespace Database\Seeders;

use App\Models\Beneficiary;
use App\Models\ClauseAssessment;
use App\Models\HardCaseFlag;
use App\Models\Interview;
use App\Services\ClauseRuleEngine;
use App\Services\SheetAggregator;
use Illuminate\Database\Seeder;

class SyntheticInterviewSeeder extends Seeder
{
    public function run(ClauseRuleEngine $ruleEngine, SheetAggregator $aggregator): void
    {
        $dataset = [
            // 1. Selam - The clean benchmark persona
            [
                'name' => 'Selam Tesfaye',
                'persona_type' => 'selam',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Call Centre Agent',
                'gender' => 'Female',
                'age_band' => '15-24',
                'monthly_salary_etb' => 6500,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "Hello. My name is Selam Tesfaye, I am 22 years old. I was placed in a call centre in Addis Ababa 6 months ago. I work 40 hours per week, Monday through Friday, 8 hours a day. I am paid 6500 ETB monthly with direct bank deposit and pension deducted. I am free to join the workers group, there is no discrimination, no forced labour, and I started this job as an adult.",
            ],
            // 2. Abel - The ambiguous benchmark persona
            [
                'name' => 'Abel Kebede',
                'persona_type' => 'abel',
                'phone_type' => 'feature_phone',
                'language' => 'am',
                'job_position' => 'Construction Daily Labourer',
                'gender' => 'Male',
                'age_band' => '15-24',
                'monthly_salary_etb' => 4200,
                'employer_reported_value' => 1, // Employer claims continuous good job
                'worker_reported_value' => 0,
                'transcript' => "ስሜ አቤል ከበደ ይባላል። ዕድሜዬ 19 ዓመት ነው። በአዳማ ከተማ አቅራቢያ በኮንስትራክሽን ቦታ ላይ በቀን ሠራተኛነት እሠራለሁ። ክፍያዬን በጥሬ ገንዘብ ነው የማገኘው። ሥራውን የጀመርኩት ከክረምቱ በኋላ ነው፣ አምስት ወይም ሰባት ወር ሊሆን ይችላል፣ ሥራ በተገኘበት ቀን ብቻ ነው የምሠራው።",
            ],
            // 3. Tigist - Garment worker Hawassa Industrial Park (Clean case)
            [
                'name' => 'Tigist Alemu',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Garment Sewing Machine Operator',
                'gender' => 'Female',
                'age_band' => '15-24',
                'monthly_salary_etb' => 5200,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "My name is Tigist Alemu. I am 21 years old. I work at the textile factory in Hawassa Industrial Park. I work 45 hours per week on regular shifts. I earn 5200 ETB every month. We have a workers association on the shop floor. I started working here when I was 20. No forced overtime and fair treatment.",
            ],
            // 4. Dawit - Leather tanning (Discrepancy: forced excessive overtime / inability to leave)
            [
                'name' => 'Dawit Mengistu',
                'persona_type' => 'synthetic',
                'phone_type' => 'feature_phone',
                'language' => 'en',
                'job_position' => 'Leather Tannery Worker',
                'gender' => 'Male',
                'age_band' => '25-34',
                'monthly_salary_etb' => 4800,
                'employer_reported_value' => 1, // Employer claims good job
                'worker_reported_value' => 0,
                'transcript' => "I am Dawit, 26 years old. I work in Mojo tannery. I work 55 hours per week. But the supervisor locked our IDs and we are forced to stay past night shifts without leaving freely. We are not allowed to join any union.",
            ],
            // 5. Yordanos - Food packaging (Under-15 Hard Stop)
            [
                'name' => 'Yordanos Girma',
                'persona_type' => 'synthetic',
                'phone_type' => 'feature_phone',
                'language' => 'en',
                'job_position' => 'Packaging Assistant',
                'gender' => 'Female',
                'age_band' => 'Under 15',
                'monthly_salary_etb' => 2500,
                'employer_reported_value' => 1, // Employer reported as valid adult
                'worker_reported_value' => 0,
                'transcript' => "Hello, my name is Yordanos. I am 14 years old. I work in the biscuit packaging workshop after school hours.",
            ],
            // 6. Biruk - Metal fabrication (Clean case)
            [
                'name' => 'Biruk Tadesse',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Welding & Metal Assembler',
                'gender' => 'Male',
                'age_band' => '15-24',
                'monthly_salary_etb' => 7800,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "My name is Biruk. I am 23 years old. Completed TVET training and hired in Akaki metal fabrication. I work 40 hours per week and earn 7800 ETB per month. Safe gear provided, freedom to organize, and no discrimination.",
            ],
            // 7. Meron - Agro-processing (Wage discrepancy)
            [
                'name' => 'Meron Bekele',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Edible Oil Quality Sorter',
                'gender' => 'Female',
                'age_band' => '15-24',
                'monthly_salary_etb' => 3100,
                'employer_reported_value' => 1, // Employer reported 6000 ETB
                'worker_reported_value' => 0,
                'transcript' => "I am Meron, age 20. I work in Debre Birhan edible oil plant for 30 hours a week. The employer reports they pay 6000 ETB, but we only receive 3100 ETB in cash with no pay slip.",
            ],
            // 8. Natnael - Solar installation technician (Clean case)
            [
                'name' => 'Natnael Haile',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Solar PV Junior Technician',
                'gender' => 'Male',
                'age_band' => '15-24',
                'monthly_salary_etb' => 8500,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "I am Natnael, 24 years old. Placed as solar installer in rural electrification project. I work 40 hours per week, earning 8500 ETB per month. Great team, equal opportunity, and voluntary overtime with pay.",
            ],
            // 9. Rahel - Retail & inventory (Clean case)
            [
                'name' => 'Rahel Kassaye',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Inventory & Stock Clerk',
                'gender' => 'Female',
                'age_band' => '25-34',
                'monthly_salary_etb' => 6200,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "My name is Rahel, 25 years old. Working in logistics warehouse in Addis Ababa. I work 42 hours per week. Salary is 6200 ETB deposited to bank. Free to join union, no discrimination observed.",
            ],
            // 10. Henok - Coffee washing station (Seasonal Ambiguity)
            [
                'name' => 'Henok Worku',
                'persona_type' => 'synthetic',
                'phone_type' => 'feature_phone',
                'language' => 'en',
                'job_position' => 'Coffee Washing Station Operator',
                'gender' => 'Male',
                'age_band' => '15-24',
                'monthly_salary_etb' => 3800,
                'employer_reported_value' => 1, // Employer reported continuous 6 months
                'worker_reported_value' => 0,
                'transcript' => "My name is Henok, 20 years old in Jimma zone. I work during harvest season only. It has been a few months, maybe 10 weeks so far, whenever coffee cherries arrive. Paid in cash.",
            ],
            // 11. Bethel - Pharmaceutical packaging (Clean case)
            [
                'name' => 'Bethel Yohannes',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Pharma Cleanroom Operator',
                'gender' => 'Female',
                'age_band' => '15-24',
                'monthly_salary_etb' => 7100,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "I am Bethel, 22 years old. Working at Kilinto Industrial Park pharma manufacturer. 40 hours per week on rotational shift. Salary 7100 ETB with health insurance. Full freedom of association.",
            ],
            // 12. Solomon - Hospitality server (Clean case)
            [
                'name' => 'Solomon Negash',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Hotel Service Associate',
                'gender' => 'Male',
                'age_band' => '15-24',
                'monthly_salary_etb' => 5800,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "I am Solomon, 21 years old in Bishoftu resort. I work 44 hours per week, 5800 ETB salary plus tips. Started when I was 19. No harassment and safe working conditions.",
            ],
            // 13. Helen - Poultry farm technician (Discrimination reported)
            [
                'name' => 'Helen Desta',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Poultry Farm Attendant',
                'gender' => 'Female',
                'age_band' => '15-24',
                'monthly_salary_etb' => 4500,
                'employer_reported_value' => 1, // Employer reported compliant
                'worker_reported_value' => 0,
                'transcript' => "I am Helen, 22 years old in Debre Zeit poultry enterprise. 40 hours a week. Female workers are paid 1500 ETB less than male workers doing the exact same grading tasks. Clear gender discrimination.",
            ],
            // 14. Yohannes - Automotive maintenance (Clean case)
            [
                'name' => 'Yohannes Getachew',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Junior Auto Mechanic',
                'gender' => 'Male',
                'age_band' => '15-24',
                'monthly_salary_etb' => 8000,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "I am Yohannes, 24 years old. Working in fleet garage in Addis Ababa. 40 hours per week, 8000 ETB monthly. Training completed under sequa programme. Fully voluntary employment and worker representation.",
            ],
            // 15. Aster - Bakery & confectionery (Clean case)
            [
                'name' => 'Aster Lemma',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Commercial Bakery Baker',
                'gender' => 'Female',
                'age_band' => '25-34',
                'monthly_salary_etb' => 6400,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "My name is Aster, 27 years old. I work at commercial industrial bakery in Bahir Dar. 40 hours per week, 6400 ETB per month. Clean conditions, equal pay, free to join workers committee.",
            ],
            // 16. Elias - Warehouse forklift operator (Clean case)
            [
                'name' => 'Elias Assefa',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Forklift Operator',
                'gender' => 'Male',
                'age_band' => '15-24',
                'monthly_salary_etb' => 7400,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "I am Elias, 23 years old. Placed as certified forklift driver in Modjo dry port. 40 hours a week, 7400 ETB monthly. Proper PPE safety, voluntary overtime, and fair management.",
            ],
            // 17. Senait - ICT data entry (Clean case)
            [
                'name' => 'Senait Fikru',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Data Entry Associate',
                'gender' => 'Female',
                'age_band' => '15-24',
                'monthly_salary_etb' => 6800,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "I am Senait, 21 years old in Addis Ababa tech hub. 38 hours per week, 6800 ETB salary. Free to join workers union, equal treatment, began working as an adult.",
            ],
            // 18. Tariku - Brick masonry (Under-hours discrepancy)
            [
                'name' => 'Tariku Bogale',
                'persona_type' => 'synthetic',
                'phone_type' => 'feature_phone',
                'language' => 'en',
                'job_position' => 'Bricklayer Assistant',
                'gender' => 'Male',
                'age_band' => '15-24',
                'monthly_salary_etb' => 2800,
                'employer_reported_value' => 1, // Employer reported full time
                'worker_reported_value' => 0,
                'transcript' => "My name is Tariku, 18 years old in Dire Dawa. I only get called to work 12 hours per week when concrete mixing happens. Paid per bag.",
            ],
            // 19. Hana - Garment quality inspector (Clean case)
            [
                'name' => 'Hana Shiferaw',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Garment Quality Controller',
                'gender' => 'Female',
                'age_band' => '15-24',
                'monthly_salary_etb' => 6100,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "My name is Hana, 22 years old in Bole Lemi Industrial Park. 40 hours per week, 6100 ETB monthly. Formal contract signed, pension enrolled, free to associate.",
            ],
            // 20. Fikadu - Plastic recycling operator (Clean case)
            [
                'name' => 'Fikadu Ayele',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Recycling Extruder Operator',
                'gender' => 'Male',
                'age_band' => '25-34',
                'monthly_salary_etb' => 6600,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "I am Fikadu, 26 years old in Dukem manufacturing zone. 40 hours per week, 6600 ETB salary. Voluntary shifts, no child labour in plant, active workers committee.",
            ],
            // 21. Martha - Dairy processing (Clean case)
            [
                'name' => 'Martha Gebre',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Dairy Pasteurization Assistant',
                'gender' => 'Female',
                'age_band' => '15-24',
                'monthly_salary_etb' => 5900,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "I am Martha, 20 years old in Sebeta dairy plant. 40 hours per week, 5900 ETB per month. Equal treatment for women, freedom to join workers group, started when 19.",
            ],
            // 22. Getu - Carpentry & joinery (Clean case)
            [
                'name' => 'Getu Hailu',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Furniture Assembler',
                'gender' => 'Male',
                'age_band' => '15-24',
                'monthly_salary_etb' => 7000,
                'employer_reported_value' => 1,
                'worker_reported_value' => 1,
                'transcript' => "I am Getu, 23 years old in Hawassa woodworking collective. 40 hours a week, 7000 ETB monthly. Full safety equipment, free to organize, no discrimination.",
            ],
            // 23. Almaz - Textile dyeing (Union rights denied discrepancy)
            [
                'name' => 'Almaz Zewde',
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
                'job_position' => 'Textile Dyeing Helper',
                'gender' => 'Female',
                'age_band' => '15-24',
                'monthly_salary_etb' => 5000,
                'employer_reported_value' => 1, // Employer reported full compliance
                'worker_reported_value' => 0,
                'transcript' => "I am Almaz, 21 years old in Kombolcha. I work 40 hours per week, 5000 ETB salary. But factory management banned all workers unions and threatens to fire anyone who attends meetings.",
            ],
        ];

        foreach ($dataset as $data) {
            $beneficiary = Beneficiary::create([
                'name' => $data['name'],
                'persona_type' => $data['persona_type'],
                'phone_type' => $data['phone_type'],
                'language' => $data['language'],
            ]);

            $isUnder15 = str_contains($data['transcript'], '14 years old') || str_contains($data['transcript'], '13 years old');

            $interview = Interview::create([
                'beneficiary_id' => $beneficiary->id,
                'status' => $isUnder15 ? 'stopped_hard_case' : 'completed',
                'transcript_raw' => $data['transcript'],
                'consent_given' => true,
                'started_at' => now()->subHours(rand(1, 48)),
                'completed_at' => now()->subHours(rand(0, 24)),
            ]);

            if ($isUnder15) {
                HardCaseFlag::create([
                    'interview_id' => $interview->id,
                    'type' => 'under_15',
                    'detail' => 'Minor detected: Stated age 14 is under legal threshold of 15. Interview stopped immediately.',
                ]);
            }

            // Extract heuristic signals
            $extracted = $this->extractSignals($data['transcript']);
            $verdicts = $ruleEngine->evaluate($interview, $extracted);

            foreach ($verdicts as $clauseKey => $verdict) {
                ClauseAssessment::create([
                    'interview_id' => $interview->id,
                    'clause_key' => $clauseKey,
                    'status' => $verdict['status'],
                    'confidence' => $verdict['confidence'],
                    'evidence_quote' => $verdict['evidence_quote'],
                    'raw_llm_output' => $extracted[$clauseKey] ?? null,
                    'sdg_tags' => $verdict['sdg_tags'] ?? [],
                ]);
            }

            // If forced or union banned or under15, flag hard cases / contradictions
            if (str_contains(strtolower($data['transcript']), 'locked our ids') || str_contains(strtolower($data['transcript']), 'banned all workers unions')) {
                HardCaseFlag::create([
                    'interview_id' => $interview->id,
                    'type' => 'contradiction',
                    'detail' => 'Worker report contradicts employer compliance claim on fundamental rights.',
                ]);
            }

            // Aggregate into sheet_rows
            $aggregator->aggregate($interview, [
                'job_position' => $data['job_position'],
                'gender' => $data['gender'],
                'age_band' => $data['age_band'],
                'monthly_salary_etb' => $data['monthly_salary_etb'],
                'employer_reported_value' => $data['employer_reported_value'],
                'worker_reported_value' => $data['worker_reported_value'],
            ]);
        }
    }

    private function extractSignals(string $text): array
    {
        $lower = strtolower($text);

        // Age detection
        $ageConfidence = 0.4;
        $ageQuote = null;
        $ageSignal = 'Age not clearly stated';
        if (preg_match('/(\b(?:I am|I\'m|age is|aged|years old|ዕድሜዬ)\s*(\d{1,2})|\b(\d{1,2})\s*(?:years old|ዓመት))/iu', $text, $m)) {
            $ageVal = $m[2] ?: $m[3];
            $ageSignal = "Beneficiary stated age {$ageVal}";
            $ageQuote = $m[0];
            $ageConfidence = 0.95;
        }

        // Hours & duration
        $hoursConfidence = 0.4;
        $hoursQuote = null;
        $hoursSignal = 'Hours ambiguous';
        if (preg_match('/(\b\d+\s*hours?\s*(?:\/|\s*per\s*)?\s*week|\b\d+\s*hrs?\s*a\s*week|\d+\s*ሰዓት)/iu', $text, $m)) {
            $hoursSignal = "Works {$m[0]}";
            $hoursQuote = $m[0];
            $hoursConfidence = 0.92;
        } elseif (str_contains($lower, 'after the rains') || str_contains($lower, 'ከክረምቱ በኋላ') || str_contains($lower, 'few months') || str_contains($lower, 'casual') || str_contains($lower, 'harvest season')) {
            $hoursSignal = 'Relative duration stated: after the rains / harvest season / uncertain months';
            $hoursQuote = str_contains($lower, 'harvest season') ? 'harvest season only' : 'after the rains';
            $hoursConfidence = 0.45; // Below 0.55 floor -> triggers unclear!
        }

        // Wage
        $wageConfidence = 0.85;
        $wageQuote = null;
        $wageSignal = 'Paid regular monthly salary';
        if (preg_match('/(\b\d{3,6}\s*(?:etb|birr|ብር))/iu', $text, $m)) {
            $wageSignal = "Paid {$m[0]}";
            $wageQuote = $m[0];
            $wageConfidence = 0.95;
        } elseif (str_contains($lower, 'cash') || str_contains($lower, 'daily')) {
            $wageSignal = 'Paid cash daily without fixed contract slip';
            $wageQuote = 'paid in cash';
            $wageConfidence = 0.70;
        }

        $childLaborSignal = (str_contains($lower, 'child labour') && !str_contains($lower, 'no child')) || str_contains($lower, '14 years old') || str_contains($lower, '13 years old')
            ? 'Evidence of minor/child labour indicated'
            : 'No child labour indicators found';
        
        $forcedLaborSignal = (str_contains($lower, 'forced') && !str_contains($lower, 'no forced')) || str_contains($lower, 'locked our ids') || str_contains($lower, 'cannot leave')
            ? 'Signal indicates forced or involuntary conditions'
            : 'Voluntary employment with freedom of movement';

        $discriminationSignal = (str_contains($lower, 'discrim') && !str_contains($lower, 'no discrim')) || str_contains($lower, 'gender discrimination') || str_contains($lower, 'less than male')
            ? 'Evidence of discrimination or harassment present'
            : 'Equal and fair treatment reported';

        $associationSignal = str_contains($lower, 'banned all workers unions') || str_contains($lower, 'not allowed to join') || str_contains($lower, 'banned') || str_contains($lower, 'no union')
            ? 'Worker indicates union/association rights denied'
            : 'Worker has freedom to associate and join groups';

        return [
            'age' => ['raw_signal' => $ageSignal, 'evidence_quote' => $ageQuote, 'confidence' => $ageConfidence],
            'hours_and_duration' => ['raw_signal' => $hoursSignal, 'evidence_quote' => $hoursQuote, 'confidence' => $hoursConfidence],
            'wage' => ['raw_signal' => $wageSignal, 'evidence_quote' => $wageQuote, 'confidence' => $wageConfidence],
            'child_labor' => ['raw_signal' => $childLaborSignal, 'evidence_quote' => null, 'confidence' => 0.9],
            'forced_labor' => ['raw_signal' => $forcedLaborSignal, 'evidence_quote' => null, 'confidence' => 0.9],
            'discrimination' => ['raw_signal' => $discriminationSignal, 'evidence_quote' => null, 'confidence' => 0.9],
            'freedom_of_association' => ['raw_signal' => $associationSignal, 'evidence_quote' => null, 'confidence' => 0.9],
            'needs_followup_on' => $hoursConfidence < 0.55 ? ['hours_threshold'] : [],
        ];
    }
}
