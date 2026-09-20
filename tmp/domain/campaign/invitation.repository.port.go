package campaign

import "context"

type InvitationRepository interface {
	FindByUserID(ctx context.Context, userID string) ([]*Invitation, error)
}
