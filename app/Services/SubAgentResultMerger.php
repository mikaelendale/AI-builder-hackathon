<?php

namespace App\Services;

class SubAgentResultMerger
{
    /**
     * Merge the results from EmploymentFactsAgent and RightsProtectionsAgent into the 7-key flat array.
     */
    public function merge(array $facts, array $rights): array
    {
        return [
            'age' => $facts['age'] ?? ['raw_signal' => 'Age not stated', 'evidence_quote' => null, 'confidence' => 0.0],
            'hours_and_duration' => $facts['hours_and_duration'] ?? ['raw_signal' => 'Hours not stated', 'evidence_quote' => null, 'confidence' => 0.0],
            'wage' => $facts['wage'] ?? ['raw_signal' => 'Wage not stated', 'evidence_quote' => null, 'confidence' => 0.0],
            'child_labor' => $rights['child_labor'] ?? ['raw_signal' => 'No indicators', 'evidence_quote' => null, 'confidence' => 0.5],
            'forced_labor' => $rights['forced_labor'] ?? ['raw_signal' => 'No indicators', 'evidence_quote' => null, 'confidence' => 0.5],
            'discrimination' => $rights['discrimination'] ?? ['raw_signal' => 'No indicators', 'evidence_quote' => null, 'confidence' => 0.5],
            'freedom_of_association' => $rights['freedom_of_association'] ?? ['raw_signal' => 'No indicators', 'evidence_quote' => null, 'confidence' => 0.5],
            'needs_followup_on' => array_merge(
                $facts['needs_followup_on'] ?? [],
                $rights['needs_followup_on'] ?? []
            ),
        ];
    }

    /**
     * Parse tool call steps or response objects from InterviewSupervisorAgent.
     */
    public function extractFromSupervisorResponse(mixed $response): array
    {
        $facts = [];
        $rights = [];

        if (is_object($response) && isset($response->steps)) {
            foreach ($response->steps as $step) {
                if (isset($step->tool) && is_object($step->tool)) {
                    $toolName = method_exists($step->tool, 'name') ? $step->tool->name() : get_class($step->tool);
                    if (str_contains($toolName, 'employment_facts')) {
                        $facts = is_array($step->result ?? null) ? $step->result : [];
                    } elseif (str_contains($toolName, 'rights_protections')) {
                        $rights = is_array($step->result ?? null) ? $step->result : [];
                    }
                }
            }
        } elseif (is_array($response)) {
            $facts = $response['employment_facts'] ?? $response['facts'] ?? [];
            $rights = $response['rights_protections'] ?? $response['rights'] ?? [];
        }

        return $this->merge($facts, $rights);
    }
}
