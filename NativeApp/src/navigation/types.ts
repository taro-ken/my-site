export type BlogStackParamList = {
  BlogList: undefined;
  BlogDetail: {
    id: string;
  };
};

export type MembershipStackParamList = {
  MembershipHome: undefined;
  Login: {
    registered?: boolean;
  };
  Register: undefined;
};
