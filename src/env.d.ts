/// <reference types="astro/client" />

declare namespace App {
    interface Locals {
        isLoggedIn: boolean;
        isPremium: boolean;
        isAppEmbed: boolean;
        user: import("firebase-admin/auth").UserRecord | null;
    }
}
