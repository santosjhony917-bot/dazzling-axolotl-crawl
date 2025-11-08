import * as React from 'react';

declare module '@hello-pangea/dnd' {
  export interface DraggableLocation {
    droppableId: string;
    index: number;
  }

  export interface DragStart {
    type: string;
    source: DraggableLocation;
    mode?: 'FLUID' | 'SNAP';
  }

  export interface DragUpdate extends DragStart {
    destination?: DraggableLocation | null;
    combine?: Combine | null;
  }

  export interface Combine {
    draggableId: string;
    droppableId: string;
  }

  export interface ResponderProvided {
    announce: (message: string) => void;
  }

  export interface DropResult {
    reason: 'DROP' | 'CANCEL';
    source: DraggableLocation;
    destination?: DraggableLocation | null;
    combine?: Combine | null;
    draggableId: string;
    type: string;
    mode?: 'FLUID' | 'SNAP';
  }

  export interface DragDropContextProps {
    onDragEnd: (result: DropResult, provided: ResponderProvided) => void;
    onDragStart?: (start: DragStart, provided: ResponderProvided) => void;
    onDragUpdate?: (update: DragUpdate, provided: ResponderProvided) => void;
    nonce?: string;
    enableDefaultSensors?: boolean;
    sensors?: any[];
    children: React.ReactNode;
  }

  export const DragDropContext: React.ComponentType<DragDropContextProps>;

  export interface DraggableProvidedDraggableProps extends React.HTMLAttributes<HTMLElement> {
    style?: React.CSSProperties;
  }

  export interface DraggableProvidedDragHandleProps extends React.HTMLAttributes<HTMLElement> {}

  export interface DraggableProvided {
    innerRef: (element: HTMLElement | null) => void;
    draggableProps: DraggableProvidedDraggableProps;
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
  }

  export interface DraggableStateSnapshot {
    isDragging: boolean;
    isDropAnimating: boolean;
    draggingOver?: string | null;
    combineWith?: string | null;
    combineTargetFor?: string | null;
    mode?: 'FLUID' | 'SNAP';
  }

  export interface DraggableProps {
    draggableId: string;
    index: number;
    isDragDisabled?: boolean;
    disableInteractiveElementBlocking?: boolean;
    children: (provided: DraggableProvided, snapshot: DraggableStateSnapshot) => React.ReactNode;
  }

  export const Draggable: React.ComponentType<DraggableProps>;

  export interface DroppableProvided {
    innerRef: (element: HTMLElement | null) => void;
    droppableProps: React.HTMLAttributes<HTMLElement>;
    placeholder?: React.ReactElement | null;
  }

  export interface DroppableStateSnapshot {
    isUsingPlaceholder: boolean;
    draggingOver?: string | null;
    isDraggingOver: boolean;
    draggingFromThisWith?: string | null;
  }

  export interface DroppableProps {
    droppableId: string;
    type?: string;
    mode?: 'standard' | 'virtual';
    renderClone?: (provided: DraggableProvided, snapshot: DraggableStateSnapshot, rubric: DraggableRubric) => React.ReactNode;
    isDropDisabled?: boolean;
    isCombineEnabled?: boolean;
    ignoreContainerClipping?: boolean;
    direction?: 'vertical' | 'horizontal';
    children: (provided: DroppableProvided, snapshot: DroppableStateSnapshot) => React.ReactNode;
  }

  export interface DraggableRubric {
    draggableId: string;
    source: DraggableLocation;
  }

  export const Droppable: React.ComponentType<DroppableProps>;
}