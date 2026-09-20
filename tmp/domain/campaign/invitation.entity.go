package campaign

import "meye-core/internal/domain/shared"

type InvitationState string

const (
	InvitationStatePending  InvitationState = "pending"
	InvitationStateAccepted InvitationState = "accepted"
)

type Invitation struct {
	id         string
	campaignID string
	userID     string
	state      InvitationState
}

func NewInvitation(campaignID, userID string, identificationService shared.IdentificationService) *Invitation {
	id := identificationService.GenerateID()

	return &Invitation{
		id:         id,
		campaignID: campaignID,
		userID:     userID,
		state:      InvitationStatePending,
	}
}
func (i *Invitation) ID() string             { return i.id }
func (i *Invitation) CampaignID() string     { return i.campaignID }
func (i *Invitation) UserID() string         { return i.userID }
func (i *Invitation) State() InvitationState { return i.state }

func (i *Invitation) accept() {
	i.state = InvitationStateAccepted
}

func CreateInvitationWithoutValidation(id, campaignID, userID string, state InvitationState) *Invitation {
	return &Invitation{
		id:         id,
		campaignID: campaignID,
		userID:     userID,
		state:      state,
	}
}
