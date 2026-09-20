package campaign

import "context"

type CampaignQueryService interface {
	GetCampaignsBasicInfo(ctx context.Context, masterID string) ([]*CampaignBasicInfo, error)
}
