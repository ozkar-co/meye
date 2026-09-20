package user

//go:generate mockgen -destination=../../../tests/mocks/jwt_service_mock.go -package=mocks meye-core/internal/domain/user JWTService
type JWTService interface {
	GenerateSignedToken(user *User) (string, error)
	ValidateToken(tokenString string) (string, error)
}
