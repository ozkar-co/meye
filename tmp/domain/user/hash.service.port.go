package user

//go:generate mockgen -destination=../../../tests/mocks/hash_service_mock.go -package=mocks meye-core/internal/domain/user HashService
type HashService interface {
	Hash(password string) (string, error)
	Compare(hashedPassword, password string) error
}
