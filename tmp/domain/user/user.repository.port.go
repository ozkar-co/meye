package user

import "context"

//go:generate mockgen -destination=../../../tests/mocks/user_repository_mock.go -package=mocks -mock_names=Repository=MockUserRepository meye-core/internal/domain/user Repository
type Repository interface {
	Save(ctx context.Context, user *User) error
	FindByUsername(ctx context.Context, username string) (*User, error)
	FindByID(ctx context.Context, id string) (*User, error)
	FindByRole(ctx context.Context, role UserRole, page, size int) ([]*User, error)
}
