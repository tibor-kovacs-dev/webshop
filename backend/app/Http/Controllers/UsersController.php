<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class UsersController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $validated = $request->validated();

        $user = DB::transaction(function () use ($validated) {
            return User::create([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'phone' => $validated['phone'] ?? null,
                'zipcode' => $validated['zipcode'] ?? null,
                'city' => $validated['city'] ?? null,
                'street' => $validated['street'] ?? null,
                'house_number' => $validated['house_number'] ?? null,
                'apartment' => $validated['apartment'] ?? null,
            ]);
        });

        event(new Registered($user));

        return response()->noContent();
    }

    public function getAuthenticatedUser(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return response()->json([
            'user' => $user,
        ]);
    }

    public function login(LoginRequest $request)
    {
        $request->ensureIsNotRateLimited();

        $credentials = $request->only('email', 'password');

        if (! Auth::guard('web')->attempt($credentials)) {
            RateLimiter::hit($request->throttleKey(), 60);

            return response()->json([
                'message' => 'Invalid email or password.',
            ], 401);
        }

        RateLimiter::clear($request->throttleKey());

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful.',
            'user' => $request->user('web'),
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Logout successful.',
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'phone' => 'sometimes|nullable|string|max:30',
            'zipcode' => 'sometimes|nullable|string|max:20',
            'city' => 'sometimes|nullable|string|max:255',
            'street' => 'sometimes|nullable|string|max:255',
            'house_number' => 'sometimes|nullable|string|max:50',
            'apartment' => 'sometimes|nullable|string|max:50',
        ]);

        $user->fill($validated);
        $user->save();

        return response()->json([
            'user' => $user->fresh(),
            'message' => 'A profil adatok sikeresen frissültek!',
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        if ($user->email === 'demo@example.com') {
            return response()->json([
                'message' => 'The demo account password cannot be changed.',
                'message_key' => 'profile.settings.passwordChange.demoBlocked',
            ], 403);
        }

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8',
        ]);

        if (! Hash::check(
            $validated['current_password'],
            $user->password
        )) {
            return response()->json([
                'message' => 'The current password is incorrect.',
                'message_key' => 'profile.settings.passwordChange.currentIncorrect',
            ], 422);
        }

        $user->password = $validated['new_password'];
        $user->save();

        return response()->json([
            'message' => 'Password changed successfully.',
            'message_key' => 'profile.settings.passwordChange.success',
        ]);
    }
}