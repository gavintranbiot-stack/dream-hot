import type { RoleVoiceConfig, ScriptSegment, VoiceJob } from '../../shared/types';

export function buildVoiceJobs(
  segments: ScriptSegment[],
  roles: RoleVoiceConfig[],
  selectedProvider: string
): VoiceJob[] {
  const fallback = roles.find((role) => role.role === 'narrator') ?? roles[0];
  const provider = selectedProvider.trim();
  if (!provider) {
    throw new Error('A TTS engine must be selected before synthesis.');
  }

  return segments.map((segment, index) => {
    const explicitRoleConfig = roles.find(
      (role) => role.role === segment.role || role.displayName === segment.role
    );
    const roleConfig = explicitRoleConfig ?? fallback;
    if (!roleConfig) {
      throw new Error(`No voice configuration available for role "${segment.role}".`);
    }

    return {
      id: `segment-${index + 1}`,
      order: index,
      role: explicitRoleConfig ? roleConfig.role : segment.role,
      displayName: explicitRoleConfig ? roleConfig.displayName : segment.role,
      provider,
      voice: roleConfig.voice,
      instructions: mergeInstructions(roleConfig.instructions, segment.emotion),
      text: segment.text
    };
  });
}

function mergeInstructions(
  baseInstructions: string | undefined,
  emotion: string | undefined
): string | undefined {
  const instructions = baseInstructions?.trim();
  const cleanEmotion = emotion?.trim();

  if (instructions && cleanEmotion) {
    return `${instructions}; emotion: ${cleanEmotion}`;
  }

  return instructions || (cleanEmotion ? `emotion: ${cleanEmotion}` : undefined);
}
