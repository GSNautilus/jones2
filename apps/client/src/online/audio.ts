/**
 * The original game's audio comes from the private bucket once this browser
 * holds a seat (assets/README.md). Without one, the player keeps the local
 * loader: the dev server's copy, or silence on the public site.
 */
import { useEffect } from 'react';
import { audio } from '../audio';
import { supabaseAssets } from '../audio/assets';
import { supa } from './api';

let switched = false;

/** Point the audio player at the bucket. Safe to call again. */
export function switchToBucketAudio(): void {
  if (switched) return;
  switched = true;
  audio.useAssets(supabaseAssets(supa()));
}

/** Switch once `seated` becomes true. */
export function useOnlineAudio(seated: boolean): void {
  useEffect(() => {
    if (seated) switchToBucketAudio();
  }, [seated]);
}
