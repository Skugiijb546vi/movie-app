# Watch Together (Rooms)

Feature-eki nway bo bakarhenerani VIP ka pekawa flim/znjire sayr aken, dang la layekawa bo layek-tr azano, u host kontroli play/pause/seek daket.

## Database (yak migration)

- `public.watch_rooms`: `id` (short 6-char code, PK), `host_id` (uuid → auth.users), `media_id` (text), `media_kind` (text), `is_active` (bool), `created_at`.
  - RLS: SELECT bo `authenticated` (bo chuna zhurawa ba code). INSERT tanha VIP (`has_role(auth.uid(),'vip')`) u `host_id=auth.uid()`. UPDATE/DELETE tanha host.
- `public.watch_room_members`: `room_id`, `user_id`, `joined_at`. PK (room_id, user_id).
  - RLS: andamani room-aka atwann bebnn u xoyan bchne/darchn.
- GRANT-akan u `ENABLE ROW LEVEL SECURITY` bo hardukyan.

## Realtime sync (Supabase Channels)

Kanaleki `room:{id}` bo har room:
- **Presence**: lista aw kasanay onlinen la room.
- **Broadcast** events:
  - `state` (tanha host anerdret): `{ t: number, playing: boolean, at: number }` (har 3ch, u ba katey play/pause/seek).
  - `chat`: peyami text.
  - `webrtc-signal`: SDP/ICE bo voice.

Guest-akan bo har `state`-ek ka wargirt: agar |video.currentTime − t| > 1.5s → seek; agar playing gorawa → play/pause. Video-kayan muted control-nyshan nakat bo guest.

## Voice chat (WebRTC mesh)

- Har peer `RTCPeerConnection` bo har peer-eki-tr drust dake.
- Signaling la ser `broadcast` (`webrtc-signal`).
- STUN: `stun:stun.l.google.com:19302` (free).
- UI: dukmey Mic on/off, lista andaman ba nyshaneki "ademwan/bedange".
- Bo mesh biciluk-akan (≤6 peer) besa; agar zyad but limit-y damand-nishan adet.

## UI

- **`/rooms` (route nway, `_authenticated`)**: dukmey "Room drust bka" (tanha VIP), lasti room-akani xot, u form-eki "Bchna zhurawa ba Room ID".
- **`/room/$id` (route nway, `_authenticated`)**: layout wak `/watch/$id`:
  - VideoPlayer-y hazir (`src/components/VideoPlayer.tsx`) — guest bo kontrol lockrawa, host normal.
  - Sidebar/panel: lista andaman + VIP crown, dukmey Mic, text chat, kod copy krdn.
  - Agar not VIP u bhawe drust kay → CTA "Bo VIP bwara".
- **La ser hamu `MediaCard` u `/watch/$id`**: dukmeyeki "Pekawa sayr bka" (tanha VIP dyare) ka rasterik `/rooms?media=<id>&kind=<k>` da kata bo drustkrdn.
- **BottomNav**: item-eki "Rooms" (tanha VIP dyare).

## Technical Details

- Room ID: 6 xshtey haruf+jimara (bo asani copy/paste).
- Host kontrol: la naw `VideoPlayer.tsx` `onHostStateChange?` prop-e nway zyad kre; guest mode dukmakan hide/disable akat.
- Realtime hook: `src/lib/useWatchRoom.ts` bo presence + broadcast + WebRTC.
- Zman: 3 key nway la `i18n.tsx` (`watchTogether`, `createRoom`, `joinRoom`, `roomCode`, `micOn`, `micOff`).

## Fayl-akan ka drust yan gore akren

- **New migration**: `watch_rooms`, `watch_room_members` + RLS + GRANT.
- **New**: `src/lib/useWatchRoom.ts`, `src/routes/rooms.tsx`, `src/routes/room.$id.tsx`.
- **Edit**: `src/components/VideoPlayer.tsx` (guest lock + host broadcast callback), `src/components/BottomNav.tsx` (Rooms item), `src/components/MediaCard.tsx` u `src/routes/watch.$id.tsx` ("Pekawa sayr bka" dukme), `src/lib/i18n.tsx`.
