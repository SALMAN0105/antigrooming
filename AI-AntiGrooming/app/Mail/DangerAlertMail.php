<?php

namespace App\Mail;

use App\Models\Incident;
use App\Models\Child;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DangerAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public $incident;
    public $child;

    /**
     * Create a new message instance.
     */
    public function __construct(Incident $incident, Child $child)
    {
        $this->incident = $incident;
        $this->child = $child;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '⚠️ PERINGATAN KRITIS: Terdeteksi Bahaya Grooming pada ' . $this->child->nama,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.danger_notification',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
