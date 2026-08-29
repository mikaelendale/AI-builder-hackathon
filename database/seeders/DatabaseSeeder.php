<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'hiwot@sequa-ethiopia.org'],
            [
                'name' => 'Hiwot (Monitoring Officer)',
                'password' => bcrypt('password'),
            ]
        );

        $this->call([
            SyntheticInterviewSeeder::class,
        ]);
    }
}
