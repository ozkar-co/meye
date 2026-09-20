package campaign

import "context"

type PjQueryService interface {
	GetPjsBasicInfo(ctx context.Context, userID string) ([]*PjBasicInfo, error)
}
