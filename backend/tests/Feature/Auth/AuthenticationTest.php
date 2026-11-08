<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private function spa(): static
    {
        return $this->withHeaders([
            'Origin' => 'http://localhost:5173',
            'Referer' => 'http://localhost:5173/',
        ]);
    }

    public function test_users_can_authenticate_using_the_login_endpoint(): void
    {
        $user = User::factory()->create(['password' => bcrypt('password')]);

        $response = $this->spa()->postJson('/api/users/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonMissingPath('user.token');

        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_login_email_is_case_insensitive(): void
    {
        $user = User::factory()->create([
            'email' => 'person@example.com',
            'password' => bcrypt('password'),
        ]);

        $this->spa()->postJson('/api/users/login', [
            'email' => '  PERSON@Example.com ',
            'password' => 'password',
        ])->assertOk();

        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create(['password' => bcrypt('password')]);

        $this->spa()->postJson('/api/users/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])
            ->assertUnauthorized()
            ->assertJson(['message' => 'Invalid email or password.']);

        $this->assertGuest('web');
    }

    public function test_login_requires_email_and_password(): void
    {
        $this->spa()->postJson('/api/users/login', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_login_is_throttled_after_repeated_failures(): void
    {
        $user = User::factory()->create(['password' => bcrypt('password')]);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->spa()->postJson('/api/users/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ])->assertUnauthorized();
        }

        $this->spa()->postJson('/api/users/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertTooManyRequests();
    }

    public function test_authenticated_user_endpoint_requires_a_session(): void
    {
        $this->getJson('/api/users/me')->assertUnauthorized();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/users/me')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_users_can_log_out(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->spa()
            ->postJson('/api/users/logout')
            ->assertOk()
            ->assertJson(['message' => 'Logout successful.']);

        $this->assertGuest('web');
    }

    public function test_logging_out_requires_authentication(): void
    {
        $this->postJson('/api/users/logout')->assertUnauthorized();
    }
}