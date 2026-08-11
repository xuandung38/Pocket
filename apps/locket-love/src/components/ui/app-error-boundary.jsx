import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#0c0c0c",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "24px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          }}
        >
          <p
            style={{
              color: "#ffffff",
              fontSize: "16px",
              textAlign: "center",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Ứng dụng gặp lỗi không mong muốn.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#ffffff",
              color: "#0c0c0c",
              border: "none",
              borderRadius: "12px",
              padding: "12px 28px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tải lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
