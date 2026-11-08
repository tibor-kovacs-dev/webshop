<?php

namespace Tests\Support;

use Stripe\ApiRequestor;
use Stripe\HttpClient\ClientInterface;

class FakeStripeClient implements ClientInterface
{
    public array $requests = [];

    private array $handlers = [];

    public static function install(): self
    {
        $client = new self();

        ApiRequestor::setHttpClient($client);

        return $client;
    }

    public static function uninstall(): void
    {
        ApiRequestor::setHttpClient(null);
    }

    public static function paymentIntent(array $attributes = []): array
    {
        $intent = array_merge([
            'id' => 'pi_test_1',
            'object' => 'payment_intent',
            'client_secret' => 'pi_test_1_secret_abc',
            'amount' => 1000,
            'amount_received' => 0,
            'currency' => 'huf',
            'status' => 'requires_payment_method',
            'metadata' => [],
        ], $attributes);

        if ($intent['metadata'] === []) {
            $intent['metadata'] = new \stdClass();
        }

        return $intent;
    }

    public function respond(string $method, string $pattern, array|callable $body, int $status = 200): self
    {
        array_unshift($this->handlers, [strtolower($method), $pattern, $body, $status]);

        return $this;
    }

    public function request($method, $absUrl, $headers, $params, $hasFile, $apiMode = 'v1', $maxNetworkRetries = null)
    {
        $path = parse_url($absUrl, PHP_URL_PATH);

        $this->requests[] = [
            'method' => strtolower($method),
            'path' => $path,
            'params' => $params,
            'headers' => $headers,
        ];

        foreach ($this->handlers as [$handlerMethod, $pattern, $body, $status]) {
            if ($handlerMethod === strtolower($method) && preg_match($pattern, $path)) {
                $payload = is_callable($body) ? $body($params, $path) : $body;

                return [json_encode($payload), $status, []];
            }
        }

        return [
            json_encode(['error' => ['type' => 'invalid_request_error', 'message' => 'No fake handler registered.']]),
            404,
            [],
        ];
    }

    public function requestsTo(string $method, string $pathPattern): array
    {
        return array_values(array_filter(
            $this->requests,
            fn (array $request) => $request['method'] === strtolower($method)
                && preg_match($pathPattern, $request['path'])
        ));
    }

    public function hasIdempotencyKey(array $request, string $key): bool
    {
        foreach ($request['headers'] as $header) {
            if (stripos($header, 'Idempotency-Key:') === 0 && trim(substr($header, 16)) === $key) {
                return true;
            }
        }

        return false;
    }
}