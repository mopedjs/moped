export default interface ModalRenderProps {
  animating: boolean;
  open: boolean;
  children: React.ReactNode;
  onClose: () => void;
}
export interface ModalState {
  animating: boolean;
  open: boolean;
  children: () => React.ReactNode;
  onClose: () => void;
}
