# Phase 06 — Frontend: Fix `OptionMoment` Hooks-Order Bug + Wire `removeMoment` Key

**Owner:** dev-6 · **Effort:** 1h · **Status:** pending

## Context Links
- Plan: `plan.md`
- File: `apps/self-hosted/lovekit/src/components/OptionMoment.jsx`
- Stores referenced: `apps/self-hosted/lovekit/src/stores/useMomentsStoreV2.js`, `apps/self-hosted/lovekit/src/stores/useUploadPostStore.js`

## Overview
**Priority:** P1 · **Status:** pending
`OptionMoment.jsx:36` returns `null` BEFORE calling `useMomentsStoreV2()` and
`useUploadQueueStore()` (lines 38-39). On re-open after a session-state change, the hook
order changes → React throws "Rendered more hooks than during the previous render".
This silently breaks delete/download. Also: `removeMoment(id, selectedFriendUid)` uses
`selectedFriendUid ?? "all"` as bucket key — verify this matches the store's actual key.

## Key Insights
- React Rules of Hooks: hooks must be called in the same order every render
- Conditional return → conditional hook calls → bug
- `useMomentsStoreV2.removeMoment(momentId, ownerUid = null)` uses `ownerUid ?? "all"` as key (store line 397). FE passes `selectedFriendUid` — these may not match the bucket key the moment lives in.
- The moment's owner uid comes from the moment object itself (`moment.user`), not from the selected friend filter

## Requirements
**Functional**
- Modal open → close → re-open with different moment works (no hooks error)
- Delete published moment removes it from feed AND IndexedDB
- Delete pending upload removes from queue
- Download saves correct file extension

## Architecture
No architectural change — defect fix.

## Related Code Files
**Modify**
- `apps/self-hosted/lovekit/src/components/OptionMoment.jsx`

**Read**
- `apps/self-hosted/lovekit/src/stores/useMomentsStoreV2.js:396-412` — `removeMoment` signature
- `apps/self-hosted/lovekit/src/cache/momentDB.js` — to confirm `getMomentById` shape

## Implementation Steps
1. Move `useMomentsStoreV2()` and `useUploadQueueStore()` hook calls **above** the early-return:
   ```js
   const { post, navigation } = useApp();
   const { isOptionModalOpen, setOptionModalOpen } = navigation;
   const { selectedMomentId, setSelectedMomentId, ... } = post;
   const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);

   const removeMoment = useMomentsStoreV2((s) => s.removeMoment);
   const removeUploadItemById = useUploadQueueStore((s) => s.removeUploadItemById);

   useEffect(() => {
     document.body.style.overflow = isOptionModalOpen ? "hidden" : "";
     return () => { document.body.style.overflow = ""; };
   }, [isOptionModalOpen]);

   if (!isOptionModalOpen && !openDeleteConfirm) return null;
   ```
2. Use selectors instead of destructuring full store (avoids re-renders on unrelated mutations).
3. Fix `removeMoment` call to use the moment's actual owner uid:
   ```js
   const handleDelete = async () => {
     if (selectedMomentId) {
       const info = await getMomentById(selectedMomentId); // already imported
       const ownerUid = info?.user || info?.userUid || null;
       const deletedMoment = await DeleteMoment(selectedMomentId);
       if (deletedMoment === selectedMomentId) {
         await removeMoment(selectedMomentId, ownerUid);
         // also remove from "all" bucket since store keys both
         await removeMoment(selectedMomentId, null);
         ...
       }
     }
   };
   ```
4. Add safety: if `selectedMomentId` deletion fails, do not call `handleClose()` — let user retry.

## Todo List
- [ ] Move hook calls above early-return
- [ ] Switch to selector form for store reads
- [ ] Fix `removeMoment` to delete from owner-keyed AND all-keyed buckets
- [ ] Verify dev build no warnings
- [ ] Smoke: open option, delete a posted moment, confirm gone from feed

## Success Criteria
- React DevTools shows no "more hooks than previous render" error
- Delete clears moment from both per-friend bucket and "all" bucket
- Pending upload deletion still works

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Selector subscription churn | Low | Low | Use single-property selectors only |
| Moment owner uid missing in cache | Med | Med | Fall back to `selectedFriendUid` then `"all"` if owner unknown |

## Security Considerations
- None — defect fix

## Next Steps
- After ship, audit other components for early-return + later hook patterns
