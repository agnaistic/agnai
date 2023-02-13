import { createSignal, Component, Show } from "solid-js";
// Component Properties
interface Props {
  messageHeader: string;
  message: string;
  confirmText: string;
  declineText: string;
  onConfirm: () => void;
}

const Modal: Component<Props> = (props) => {
  const [show, setShow] = createSignal(true);

  const handleClose = () => {
    setShow(false);
  };
  // Make sure you set an onConfirm function on the page or it will simply close the modal without performing a task!!
  const handleConfirm = () => {
    props.onConfirm();
    setShow(false);
  };

  return (
    <Show when={show()}>
      <div class="fixed inset-x-0 bottom-0 px-4 pb-4 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div class="fixed inset-0 transition-opacity">
          <div class="absolute inset-0 bg-gray-500 opacity-75" />
        </div>
        <div class="overflow-hidden rounded-lg bg-black px-4 pt-5 pb-4 shadow-xl transition-all sm:w-full sm:max-w-lg">
          <div>
            <div class="black mb-4 text-lg font-bold">
              {props.messageHeader}
            </div>
            <div class="black mb-4 text-lg">{props.message}</div>
            <div class="flex items-center justify-end">
              <button
                class="text-red-500 hover:text-red-700"
                onClick={handleClose}
              >
                {props.declineText}
              </button>
              <button
                class="ml-3 rounded bg-purple-600 py-2 px-4 font-bold text-white hover:bg-purple-500"
                onClick={handleConfirm}
              >
                {props.confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default Modal;
