<?php

namespace Tests\Feature\Mail;

use App\Mail\OrderInvoiceMailable;
use App\Mail\OrderRecievedMailable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesCommerceData;
use Tests\TestCase;

class OrderMailsTest extends TestCase
{
    use RefreshDatabase, CreatesCommerceData;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resetPriceList();
    }

    private function order(string $currency, string $locale)
    {
        $user = User::factory()->create();
        $product = $this->createProduct(['name' => 'Mail product']);

        return $this->createOrder($user, $product, 3, $currency, [
            'locale' => $locale,
            'shipping_details' => [
                'first_name' => 'Anna',
                'last_name' => 'Kiss',
                'zipcode' => '1051',
                'city' => 'Budapest',
                'street' => 'Fo utca',
                'house_number' => '12',
            ],
        ]);
    }

    public function test_the_confirmation_mail_renders_huf_amounts_without_decimals(): void
    {
        $html = (new OrderRecievedMailable($this->order('huf', 'hu')))->render();

        $this->assertStringContainsString('Mail product', $html);
        $this->assertStringContainsString('236 160 Ft', $html);
        $this->assertStringContainsString('708 480 Ft', $html);
    }

    public function test_the_confirmation_mail_renders_eur_amounts_with_decimals(): void
    {
        $html = (new OrderRecievedMailable($this->order('eur', 'en')))->render();

        $this->assertStringContainsString('612,00 €', $html);
        $this->assertStringContainsString('1 836,00 €', $html);
    }

    public function test_the_invoice_mail_renders_the_billing_data(): void
    {
        $html = (new OrderInvoiceMailable($this->order('huf', 'hu')))->render();

        $this->assertStringContainsString('Anna Kiss', $html);
        $this->assertStringContainsString('1051 Budapest, Fo utca 12', $html);
        $this->assertStringContainsString('236 160 Ft', $html);
        $this->assertStringContainsString('708 480 Ft', $html);
    }

    public function test_the_invoice_mail_renders_eur_amounts(): void
    {
        $html = (new OrderInvoiceMailable($this->order('eur', 'de')))->render();

        $this->assertStringContainsString('612,00 €', $html);
        $this->assertStringContainsString('1 836,00 €', $html);
    }
}