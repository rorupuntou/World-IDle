import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const proof = await req.json();
	const app_id = process.env.NEXT_PUBLIC_APP_ID;
	const action = "play-world-idle"; // The action ID from the Developer Portal

	if (!app_id) {
		return NextResponse.json({ error: "Missing App ID" }, { status: 400 });
	}

	try {
		const res = await fetch(
			`https://developer.worldcoin.org/api/v2/verify/${app_id}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ...proof, action }),
			}
		);

		const verifyRes = await res.json();

		if (res.ok && verifyRes.success) {
			// This is where you should perform backend actions if the verification succeeds
			// Such as, setting a user as "verified" in a database
			return NextResponse.json(verifyRes, { status: 200 });
		} else {
			// This is where you should handle errors from the World ID /verify endpoint.
			// Usually these errors are due to a user having already verified.
			return NextResponse.json(verifyRes, { status: res.status });
		}
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}