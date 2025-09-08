import { router } from 'expo-router';

interface LeaveGroupParams {
  channel: any;
  currentUser: any;
  members: any[];
  isCurrentUserAdmin: () => boolean;
  isMemberAdmin: (member: any) => boolean;
  showConfirm: (title: string, message: string, onConfirm: () => Promise<void>, onCancel?: () => void, confirmText?: string, cancelText?: string) => void;
  showWarning: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
}

export const handleLeaveGroup = ({
  channel,
  currentUser,
  members,
  isCurrentUserAdmin,
  isMemberAdmin,
  showConfirm,
  showWarning,
  showError,
}: LeaveGroupParams) => {
  const isAdmin = isCurrentUserAdmin();
  const currentAdmins = channel?.data?.admins || [];
  const isOnlyAdmin = isAdmin && currentAdmins.length === 1;

  if (isOnlyAdmin) {
    // If current user is the only admin, automatically assign a new admin
    const nonAdminMembers = members.filter(member => 
      member.user_id !== currentUser.id && !isMemberAdmin(member)
    );

    if (nonAdminMembers.length === 0) {
      showWarning('Cannot Leave', 'You are the only member of this group. You cannot leave.');
      return;
    }

    // Automatically choose the first available member as the new admin
    const newAdmin = nonAdminMembers[0];
    
    showConfirm(
      'Leave Group',
      `You are the only admin. ${newAdmin.user?.name || newAdmin.user?.full_name} will automatically become the new admin. Are you sure you want to leave?`,
      async () => {
        try {
          // Assign the selected member as admin
          const updatedAdmins = [...currentAdmins, newAdmin.user_id];
          await channel.update({ admins: updatedAdmins });

          // Remove current user from admins
          const finalAdmins = updatedAdmins.filter(adminId => adminId !== currentUser.id);
          await channel.update({ admins: finalAdmins });
          
          // Mark user as left but keep them as a member so they can still see the channel
          const leftMembers = channel.data?.left_members || [];
          if (!leftMembers.includes(currentUser.id)) {
            const updatedLeftMembers = [...leftMembers, currentUser.id];
            await channel.update({ left_members: updatedLeftMembers });
          }
          
          router.replace('/(home)/(tabs)/');
        } catch (error) {
          console.error('Error leaving group:', error);
          showError('Error', 'Failed to leave group');
        }
      },
      undefined,
      'Leave',
      'Cancel'
    );
  } else {
    // Normal leave flow for non-admins or when there are other admins
    showConfirm(
      'Leave Group',
      'Are you sure you want to leave this group? You can still view the chat history but won\'t be able to send messages.',
      async () => {
        try {
          // If current user is admin but not the only one, remove from admins first
          if (isAdmin) {
            const updatedAdmins = currentAdmins.filter(adminId => adminId !== currentUser.id);
            await channel.update({ admins: updatedAdmins });
          }
          
          // Mark user as left but keep them as a member so they can still see the channel
          const leftMembers = channel.data?.left_members || [];
          if (!leftMembers.includes(currentUser.id)) {
            const updatedLeftMembers = [...leftMembers, currentUser.id];
            await channel.update({ left_members: updatedLeftMembers });
          }
          
          router.replace('/(home)/(tabs)/');
        } catch (error) {
          console.error('Error leaving group:', error);
          showError('Error', 'Failed to leave group');
        }
      },
      undefined,
      'Leave',
      'Cancel'
    );
  }
};
