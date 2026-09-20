package campaign

import "context"

//go:generate mockgen -destination=../../../tests/mocks/pj_repository_mock.go -package=mocks meye-core/internal/domain/campaign PjRepository
type PjRepository interface {
	Save(ctx context.Context, pj *PJ) error
	FindByID(ctx context.Context, id string) (*PJ, error)
}
