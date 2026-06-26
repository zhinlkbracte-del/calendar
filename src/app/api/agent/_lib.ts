import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseServiceRoleKey, getSupabaseCredentials } from '@/storage/database/supabase-client';
import { createClient } from '@supabase/supabase-js';

export interface AgentPermissions {
  events: {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  };
  tasks: {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  };
}

export interface AgentAuthResult {
  userId: string;
  agentId: string;
  agentName: string;
  permissions: AgentPermissions;
}

/**
 * Get a Supabase client using service_role key for agent operations
 */
export function getServiceRoleClient() {
  const { url } = getSupabaseCredentials();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  return createClient(url, serviceRoleKey!, {
    db: { timeout: 60000 },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
/**
 * Verify agent API key from request header
 * Returns agent auth info or null if invalid
 */
export async function verifyAgentAuth(request: NextRequest): Promise<AgentAuthResult | null> {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) return null;

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('agent_configs')
    .select('id, user_id, name, permissions, is_active')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    agentId: data.id,
    agentName: data.name,
    permissions: data.permissions as AgentPermissions,
  };
}

/**
 * Check if agent has a specific permission
 */
export function hasPermission(auth: AgentAuthResult, resource: 'events' | 'tasks', action: 'read' | 'create' | 'update' | 'delete'): boolean {
  return auth.permissions[resource]?.[action] === true;
}

/**
 * Return 401 Unauthorized response
 */
export function unauthorizedResponse(message = '未授权：请提供有效的 API Key') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Return 403 Forbidden response
 */
export function forbiddenResponse(message = '权限不足：当前 Agent 无此操作权限') {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Generate a random API key
 */
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const segments: string[] = [];
  for (let s = 0; s < 4; s++) {
    let segment = '';
    for (let i = 0; i < 8; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return `sk-${segments.join('-')}`;
}
