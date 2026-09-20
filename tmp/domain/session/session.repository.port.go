package session

import "context"

//go:generate mockgen -destination=../../../tests/mocks/session_repository_mock.go -package=mocks -mock_names=Repository=MockSessionRepository meye-core/internal/domain/session Repository
type Repository interface {
	Save(ctx context.Context, s *Session) error
}
