// Platform dispatcher — renders iOS or Android camera-flip button.
import { isIOS } from "../../../utils/is-ios.js";
import CameraToggleIOS from "./camera-toggle-ios.jsx";
import CameraToggleAndroid from "./camera-toggle-android.jsx";

/**
 * @param {{
 *   facingMode:    string,
 *   setFacingMode: (mode: string) => void,
 *   streamRef:     React.RefObject<MediaStream|null>,
 *   videoRef:      React.RefObject<HTMLVideoElement|null>,
 * }} props
 */
export default function CameraToggle(props) {
  return isIOS() ? <CameraToggleIOS {...props} /> : <CameraToggleAndroid {...props} />;
}
