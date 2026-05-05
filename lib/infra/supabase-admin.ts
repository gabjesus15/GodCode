import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { validateEnv } from "./env";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
	if (!_client) {
		validateEnv();
		const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/$/, "");
		const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
		_client = createClient(
			url,
			key,
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false,
				},
			}
		);
	}
	return _client;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
	get(_target, prop, receiver) {
		return Reflect.get(getClient(), prop, receiver);
	},
});
