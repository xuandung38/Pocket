// review-form-sheet.jsx
// Bottom sheet with a 1-5 star selector and free-text input.
// Calls onSubmit({ rating, text }) then closes when the user confirms.
import { useState } from "react";
import { Star } from "lucide-react";
import BottomSheet from "../sheets/bottom-sheet";

export default function ReviewFormSheet({ open, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!rating) return;
    onSubmit({ rating, text });
    onClose();
    // Reset for the next open
    setRating(0);
    setText("");
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Đánh giá">
      <div style={{ padding: "16px 20px 32px" }}>
        {/* Star selector */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: n <= rating ? "#FACC15" : "#555",
                padding: 2,
              }}
            >
              <Star
                size={32}
                fill={n <= rating ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>

        {/* Quote text input */}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập nhận xét..."
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            fontSize: 15,
            boxSizing: "border-box",
            outline: "none",
          }}
        />

        {/* Confirm button — disabled until a star is chosen */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!rating}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "12px",
            borderRadius: 12,
            border: "none",
            background: rating ? "#fff" : "rgba(255,255,255,0.1)",
            color: rating ? "#000" : "#666",
            fontSize: 15,
            fontWeight: 600,
            cursor: rating ? "pointer" : "not-allowed",
          }}
        >
          Xong
        </button>
      </div>
    </BottomSheet>
  );
}
