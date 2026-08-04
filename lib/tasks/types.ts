export type TaskCalendarItem = {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  ownerName: string;
  ownerPosition: string;
  ownerPositionCode: string;
  ownerImageUrl: string | null;
  participants: TaskParticipant[];
  department: string;
  departmentLabel: string;
  startDate: string;
  endDate: string;
  canEdit: boolean;
  canViewDetails: boolean;
};

export type TaskParticipant = {
  id: string;
  name: string;
  position: string;
  positionCode: string;
  department: string;
  departmentLabel: string;
  imageUrl: string | null;
};

export type TaskCalendarEmployeeOption = {
  id: string;
  name: string;
};
