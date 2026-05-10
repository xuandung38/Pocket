// OptionMoment — bottom sheet for downloading or deleting a selected moment.
// Ported from apps/self-hosted/web (LocketCameraBeta/ModalViews/OptionMoment).
// Shows a sliding sheet with two actions: download (image/video) and delete
// (moment via API, or pending upload queue item locally).
import { useEffect, useState } from "react";
import { Download, Trash2, X } from "lucide-react";

import { useApp } from "@/context/AppContext";
import {
  SonnerSuccess,
  SonnerWarning,
  SonnerInfo,
} from "@/components/ui/SonnerToast";
import Modal from "@/components/ui/Modal";
import { DeleteMoment } from "@/services";
import { getMomentById } from "@/cache/momentDB";
import { useMomentsStoreV2, useUploadQueueStore } from "@/stores";
import { downloadByLink } from "@/utils/download-by-link";

const OptionMoment = () => {
  const { post, navigation } = useApp();
  const { isOptionModalOpen, setOptionModalOpen } = navigation;
  const {
    selectedMomentId,
    setSelectedMomentId,
    setSelectedMoment,
    selectedQueue,
    selectedQueueId,
    setSelectedQueueId,
    setSelectedQueue,
    selectedFriendUid,
  } = post;

  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);

  const { removeMoment } = useMomentsStoreV2();
  const { removeUploadItemById } = useUploadQueueStore();

  // Lock body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = isOptionModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOptionModalOpen]);

  // Clear selected moment/queue references after a successful action
  const handleClose = () => {
    setSelectedMoment(null);
    setSelectedQueue(null);
    setSelectedQueueId(null);
    setSelectedMomentId(null);
  };

  const handleDelete = async () => {
    // Branch 1: deleting a published moment via API
    if (selectedMomentId !== null && selectedMomentId !== undefined) {
      try {
        const deletedMoment = await DeleteMoment(selectedMomentId);
        if (deletedMoment === selectedMomentId) {
          await removeMoment(selectedMomentId, selectedFriendUid);
          SonnerSuccess("Đã xoá ảnh thành công!");
          handleClose();
        } else {
          SonnerWarning("Xoá không thành công, vui lòng thử lại!");
        }
      } catch (error) {
        SonnerWarning("Xoá không thành công, vui lòng thử lại!");
        console.warn("❌ DeleteMoment failed", error);
      }
      return;
    }

    // Branch 2: removing a pending upload from local queue
    if (selectedQueueId !== null && selectedQueueId !== undefined) {
      try {
        await removeUploadItemById(selectedQueueId);
        SonnerSuccess("Đã xoá khỏi hàng chờ!");
        handleClose();
      } catch (error) {
        SonnerWarning("Không thể xoá khỏi hàng chờ, vui lòng thử lại!");
        console.warn("❌ removeUploadItemById failed", error);
      }
    }
  };

  const handleDownload = async () => {
    if (!selectedMomentId) return;

    try {
      const data = await getMomentById(selectedMomentId);
      if (!data) {
        SonnerInfo("Không tìm thấy moment để tải");
        return;
      }

      const { videoUrl, thumbnailUrl } = data;
      if (videoUrl) {
        downloadByLink(videoUrl, `moment_${selectedMomentId}.mp4`);
      } else if (thumbnailUrl) {
        downloadByLink(thumbnailUrl, `moment_${selectedMomentId}.jpg`);
      } else {
        SonnerInfo("Không có video hoặc thumbnail để tải");
      }
    } catch (error) {
      SonnerWarning("Tải xuống thất bại, vui lòng thử lại!");
      console.warn("❌ download moment failed", error);
    }
  };

  return (
    <>
      {/* Overlay — click to dismiss */}
      <div
        className={`fixed inset-0 bg-base-100/30 backdrop-blur-[4px] transition-opacity duration-500 z-[62] ${
          isOptionModalOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOptionModalOpen(false)}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed border-t border-base-content bottom-0 left-0 w-full pt-3 pb-6 px-4 bg-base-100 rounded-t-4xl shadow-lg transition-all duration-500 ease-in-out z-[63] flex flex-col text-base-content ${
          isOptionModalOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center rounded-t-4xl">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-lovehouse mt-1.5 font-semibold">
              Option Moment
            </div>
          </div>
          <button
            onClick={() => setOptionModalOpen(false)}
            className="btn btn-circle cursor-pointer hover:bg-base-200 p-1"
            aria-label="Đóng"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-left text-sm mt-4 text-base-content/70">
          Bạn có thể tải về hình ảnh/video của bạn bè hoặc xoá chúng khỏi lịch
          sử của bạn
        </p>

        <div className="w-full flex flex-row justify-center items-center gap-3 mt-6">
          <button
            onClick={handleDownload}
            className="btn btn-neutral btn-outline rounded-3xl w-36 flex items-center justify-center gap-2"
          >
            <Download size={24} /> Tải xuống
          </button>

          <button
            onClick={() => {
              setOptionModalOpen(false);
              setOpenDeleteConfirm(true);
            }}
            className="btn btn-neutral btn-outline rounded-3xl w-36 flex items-center justify-center gap-2"
          >
            <Trash2 size={24} /> Xoá
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={openDeleteConfirm}
        onClose={() => setOpenDeleteConfirm(false)}
        title="Xoá ảnh?"
        actions={
          <>
            <button
              onClick={() => setOpenDeleteConfirm(false)}
              className="btn btn-soft px-4 py-2 rounded-xl transition-colors"
            >
              Huỷ
            </button>
            <button
              onClick={() => {
                handleDelete();
                setOpenDeleteConfirm(false);
              }}
              className="btn btn-error px-4 py-2 rounded-xl transition-colors"
            >
              Xoá
            </button>
          </>
        }
      >
        Việc này sẽ xoá ảnh khỏi lịch sử của bạn và không thể hoàn tác.
      </Modal>
    </>
  );
};

export default OptionMoment;
