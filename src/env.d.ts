/// <reference types="astro/client" />

declare namespace App {
    interface Locals {
        isLoggedIn: boolean;
        isPremium: boolean;
        user: import("firebase-admin/auth").UserRecord | null;
    }
}
