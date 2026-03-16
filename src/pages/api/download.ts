import type { APIRoute } from "astro";
import fs from "fs/promises";
import path from "path";

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const fileName = formData.get("file")?.toString();

        if (!fileName) {
            return new Response("File name is required", { status: 400 });
        }

        // Security check
        if (fileName.includes("..") || fileName.includes("/")) {
            return new Response("Invalid file name", { status: 400 });
        }

        const filePath = path.join(process.cwd(), "public", fileName);
        const fileBuffer = await fs.readFile(filePath);

        // Hardened headers for absolute reliability
        return new Response(new Uint8Array(fileBuffer), {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
                "Content-Length": fileBuffer.length.toString(),
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            },
        });
    } catch (err) {
        console.error("POST download error:", err);
        return new Response("File not found or error occurred", { status: 404 });
    }
};
