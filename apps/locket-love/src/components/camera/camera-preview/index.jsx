// Platform dispatcher — renders the iOS or Android camera preview branch.
// isIOS() is evaluated once at render time; it never changes within a session.
import { isIOS } from "../../../utils/is-ios.js";
import CameraPreviewIOS from "./camera-preview-ios.jsx";
import CameraPreviewAndroid from "./camera-preview-android.jsx";

/**
 * @param {{
 *   streamRef:     React.RefObject<MediaStream|null>,
 *   videoRef:      React.RefObject<HTMLVideoElement|null>,
 *   facingMode:    string,
 *   setFacingMode: (mode: string) => void,
 *   setShot:       (shot: object) => void,
 *   setPhase:      (phase: string) => void,
 *   deviceId?:     string|null,
 *   setDeviceId?:  (id: string|null) => void,
 * }} props
 */
export default function CameraPreview(props) {
  return isIOS() ? <CameraPreviewIOS {...props} /> : <CameraPreviewAndroid {...props} />;
}
