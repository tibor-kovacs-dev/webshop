<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\OrderController;

use App\Http\Controllers\ProductsController;

use App\Http\Controllers\PaymentController;

use App\Http\Controllers\UsersController;
use App\Http\Controllers\PasswordController;
use App\Http\Controllers\VerificationController;

use App\Http\Controllers\StripeWebhookController;



use App\Models\Product;

use Illuminate\Support\Facades\Log;



Route::prefix('products')->group(function () {
    

    Route::get('/new', [ProductsController::class, 'getNewArrivals']);
    

    Route::get('/discounted', [ProductsController::class, 'getDiscountedProducts']);


    Route::get('/categories', [ProductsController::class, 'getCategories']);

    Route::get('/category/{category}', function ($category) {
        $products = Product::where('category', $category)->get();
        if ($products->isEmpty()) {
            return response()->json(['message' => 'No products found for this category'], 404);
        }
        return response()->json($products);
    });


    Route::post('/', [ProductsController::class, 'store'])->middleware('auth:sanctum');


    Route::get('/', [ProductsController::class, 'index']);
    

    Route::get('/{id}/comments', [ProductsController::class, 'getComments']);
    Route::post('/{id}/comments', [ProductsController::class, 'addComment'])->middleware('auth:sanctum');


    Route::patch('/{id}', [ProductsController::class, 'update'])->middleware('auth:sanctum');
    Route::delete('/{id}', [ProductsController::class, 'destroy'])->middleware('auth:sanctum');
    Route::get('/{id}', [ProductsController::class, 'show']); // Ez a legspeciálisabb, utoljára!
});


Route::post('/users/register', [UsersController::class, 'register']);

Route::post('/users/login', [UsersController::class, 'login']);



Route::get('/users', [UsersController::class, 'index'])

->middleware('auth:sanctum');


Route::get('/users/me', [UsersController::class, 'getAuthenticatedUser'])

->middleware('auth:sanctum');

Route::post('/password/forgot', [PasswordController::class, 'sendResetLink']);
Route::post('/password/reset', [PasswordController::class, 'reset']);


Route::get('/email/verify/{id}/{hash}', [VerificationController::class, 'verify'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::post('/email/resend', [VerificationController::class, 'resend'])
    ->middleware(['auth:sanctum', 'throttle:6,1'])
    ->name('verification.send');

Route::middleware('auth:sanctum')->group(function () {

Route::get('/orders', [OrderController::class, 'index']);


Route::post('/orders', [OrderController::class, 'store']);

Route::post('orders/finalize', [OrderController::class, 'finalize'])->name('orders.finalize');
Route::post('/orders/{order}/retry', [OrderController::class, 'retryPayment']);


Route::post('/order/{orderId}/refund', [OrderController::class, 'requestRefund']);

});



Route::post('/checkout/create-intent', [PaymentController::class, 'createPaymentIntent']);
Route::post('/fx-quote', [PaymentController::class, 'createFxQuote']);
Route::post('/stripe/webhook', [StripeWebhookController::class, 'handleWebhook'])->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class);