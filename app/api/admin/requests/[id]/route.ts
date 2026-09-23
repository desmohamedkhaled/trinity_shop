import { NextResponse } from 'next/server'; import { requirePermission } from '@/lib/admin';

const statuses = new Set(['pending', 'contacted', 'confirmed', 'preparing', 'completed', 'canceled']);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const access = await requirePermission('requests.update');
	if (access.response) return access.response;
	const { supabase } = access;
	const { id } = await params;
	const body = await req.json();
	const row: Record<string, string> = {};

	if (body.status !== undefined) {
		if (typeof body.status !== 'string' || !statuses.has(body.status)) {
			return NextResponse.json({ error: 'Invalid request status.' }, { status: 400 });
		}
		row.status = body.status;
	}
	if (body.admin_notes !== undefined) {
		if (typeof body.admin_notes !== 'string' || body.admin_notes.length > 2000) {
			return NextResponse.json({ error: 'Admin notes are too long.' }, { status: 400 });
		}
		row.admin_notes = body.admin_notes;
	}
	if (!Object.keys(row).length) return NextResponse.json({ error: 'No changes supplied.' }, { status: 400 });

	const { data, error } = await supabase.from('requests').update(row).eq('id', id).select().single();
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json(data);
}
