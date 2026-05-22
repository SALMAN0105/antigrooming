<?php
$user = App\Models\User::first();
if($user) {
    echo "User: " . $user->name . "\n";
    $child = $user->children()->first();
    if($child) {
        echo "Child: " . $child->nama . "\n";
        $device = $child->devices()->first();
        if($device) {
            echo "Device: " . $device->token_perangkat . "\n";
            $incident = $device->incidents()->first();
            if($incident) {
                echo "Incident: " . $incident->tingkat_risiko . "\n";
            }
        }
    }
}
