'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inviteMember, removeMember, updateMemberRole, cancelInvitation } from '@/lib/actions/team';

interface Member {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

interface TeamManagerProps {
  projectId: string;
  isOwner: boolean;
  owner: { id: string; email: string; name: string };
  members: Member[];
  invitations: Invitation[];
}

export function TeamManager({ projectId, isOwner, owner, members, invitations }: TeamManagerProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    setMessage(null);

    try {
      const result = await inviteMember(projectId, { email: email.trim(), role });
      if (result.success && result.token) {
        const inviteUrl = `${window.location.origin}/invite/${result.token}`;
        await navigator.clipboard.writeText(inviteUrl);
        setMessage({ type: 'success', text: 'Invitation created and link copied to clipboard.' });
        setEmail('');
        router.refresh();
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Failed to create invitation.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    const result = await removeMember(projectId, userId);
    if (result.success) {
      router.refresh();
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Failed to remove member.' });
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    const result = await updateMemberRole(projectId, userId, newRole);
    if (result.success) {
      router.refresh();
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Failed to update role.' });
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    const result = await cancelInvitation(projectId, invitationId);
    if (result.success) {
      router.refresh();
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Failed to cancel invitation.' });
    }
  }

  async function handleCopyLink(token: string) {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const inputClass =
    'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-elevated';

  const selectClass =
    'flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="space-y-8">
      {/* Owner */}
      <div className="rounded-xl border bg-card shadow-elevated">
        <div className="p-6">
          <h2 className="text-sm font-semibold mb-4">Owner</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                {owner.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{owner.name}</p>
                <p className="text-xs text-muted-foreground">{owner.email}</p>
              </div>
            </div>
            <span className="text-xs rounded-full bg-primary/10 text-primary px-2.5 py-1 font-medium">Owner</span>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="rounded-xl border bg-card shadow-elevated">
        <div className="p-6">
          <h2 className="text-sm font-semibold mb-4">Members</h2>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet. Invite someone to get started.</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className={selectClass + ' w-24'}
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label="Remove member"
                          title="Remove member"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" />
                            <path d="M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs rounded-full bg-muted px-2.5 py-1 font-medium capitalize">{member.role}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {isOwner && invitations.length > 0 && (
        <div className="rounded-xl border bg-card shadow-elevated">
          <div className="p-6">
            <h2 className="text-sm font-semibold mb-4">Pending Invitations</h2>
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.role} &middot; expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(inv.token)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-input bg-background hover:bg-muted transition-colors"
                    >
                      {copiedToken === inv.token ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelInvitation(inv.id)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Cancel invitation"
                      title="Cancel invitation"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invite Form */}
      {isOwner && (
        <div className="rounded-xl border bg-card shadow-elevated">
          <div className="p-6">
            <h2 className="text-sm font-semibold mb-4">Invite Member</h2>
            <form onSubmit={handleInvite} className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
                className={inputClass + ' flex-1'}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                className={selectClass + ' w-28'}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={saving || !email.trim()}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
              >
                {saving ? 'Inviting...' : 'Send Invite'}
              </button>
            </form>
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              <strong>Warning:</strong> Anyone with the invite link can create an account and join this project. Only share it with people you trust.
            </div>
          </div>
        </div>
      )}

      {/* Status message */}
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
