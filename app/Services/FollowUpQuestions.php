<?php

namespace App\Services;

class FollowUpQuestions
{
    private const TEMPLATES_EN = [
        'age_15_plus' => 'Can you tell me exactly how old you are, in years?',
        'hours_threshold' => 'About how many hours do you work in a typical week, and roughly how many months has that been going on?',
        'min_wage' => 'How much are you paid, and how often — for example, per month?',
        'no_child_labor' => 'How old were you when you started this work?',
        'no_forced_labor' => 'If you wanted to stop working here, would you be able to leave freely?',
        'no_discrimination' => 'Do you feel you are treated the same as your coworkers?',
        'freedom_of_association' => 'Are you free to join a workers group or union if you wanted to?',
    ];

    private const TEMPLATES_AM = [
        'age_15_plus' => 'እባክዎን ትክክለኛ ዕድሜዎ ስንት እንደሆነ በዓመት ሊነግሩኝ ይችላሉ?',
        'hours_threshold' => 'በተለመደው ሳምንት ውስጥ በግምት ስንት ሰዓት ይሰራሉ? እና ይህን ሥራ ከጀመሩ ስንት ወራት ሆኑ?',
        'min_wage' => 'ክፍያዎ ስንት ነው? በወር ነው ወይስ በቀን ይከፈልዎታል?',
        'no_child_labor' => 'ይህን ሥራ ሲጀምሩ ዕድሜዎ ስንት ነበር?',
        'no_forced_labor' => 'ሥራውን ማቆም ቢፈልጉ በነፃነት መልቀቅ ይችላሉ?',
        'no_discrimination' => 'ከሌሎች የሥራ ባልደረቦችዎ ጋር እኩል አያያዝ እንዳለ ይሰማዎታል?',
        'freedom_of_association' => 'የሠራተኞች ማኅበር ወይም ቡድን መቀላቀል ቢፈልጉ ይፈቀድልዎታል?',
    ];

    public function forClause(string $clauseKey, string $language = 'en'): ?string
    {
        $templates = $language === 'am' ? self::TEMPLATES_AM : self::TEMPLATES_EN;

        return $templates[$clauseKey] ?? self::TEMPLATES_EN[$clauseKey] ?? null;
    }
}
