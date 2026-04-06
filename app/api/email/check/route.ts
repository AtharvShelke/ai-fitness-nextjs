import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 });
        }

        const userEmail = await prisma.usedEmail.upsert({
            where: { email },
            update: {},
            create: { email }
        });

        if (userEmail.hasUsedApp) {
            return NextResponse.json({ 
                success: false, 
                error: "This email has already been used to generate a plan. Please use a different one." 
            }, { status: 403 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[email/check]", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
