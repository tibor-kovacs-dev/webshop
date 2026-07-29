<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Auth\Events\Registered;

class UsersController extends Controller
{
    public function register(Request $request)
    {
        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,  
            'email' => $request->email,
            'password' => Hash::make($request->password),
            
            'phone' => $request->phone,
            'zipcode' => $request->zipcode,
            'city' => $request->city,
            'street' => $request->street,
            'house_number' => $request->house_number,
            'apartment' => $request->apartment,
        ]);

        event(new Registered($user));

        return response()->noContent();
    }

    public function getAuthenticatedUser(Request $request)
    {
        if ($request->user()) {
            return response()->json(['user' => $request->user()]);
        }
        
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }

    public function login(Request $request){
        $email = $request->input('email');
        $password = $request->input('password');

        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $email)->first();

        if(!$user || !Hash::check($password, $password ? $user->password: '')){
            return response()->json([
                'message' => 'Invalid email or password'
            ], 401);
        }

        $user->tokens()->delete();
        $user->token = $user->createToken('access')->plainTextToken;

        return response()->json([
            'user' => $user
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'first_name'   => 'sometimes|required|string|max:255',
            'last_name'    => 'sometimes|required|string|max:255',
            'phone'        => 'sometimes|nullable|string|max:30',
            'zipcode'      => 'sometimes|nullable|string|max:20',
            'city'         => 'sometimes|nullable|string|max:255',
            'street'       => 'sometimes|nullable|string|max:255',
            'house_number' => 'sometimes|nullable|string|max:50',
            'apartment'    => 'sometimes|nullable|string|max:50',
        ]);

        $user->fill($validated);
        $user->save();

        return response()->json([
            'user' => $user,
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

        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'The current password is incorrect.',
                'message_key' => 'profile.settings.passwordChange.currentIncorrect',
            ], 422);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();
        $user->tokens()->where('id', '!=', $request->user()->currentAccessToken()->id)->delete();

        return response()->json([
            'message' => 'Password changed successfully.',
            'message_key' => 'profile.settings.passwordChange.success',
        ]);
    }
}