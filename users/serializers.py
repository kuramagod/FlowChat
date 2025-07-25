from django.contrib.auth import get_user_model
from rest_framework import serializers

def password_validator(password):
    if len(password) < 8:
        raise serializers.ValidationError("Слишком короткий пароль!")
    if password.lower() == password:
        raise serializers.ValidationError("В пароль не входят заглавные буквы!")
    if password.isalpha():
        raise serializers.ValidationError("В пароль не входят цифры!")
    return True


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = get_user_model()
        fields = ['id', 'username', 'first_name', 'last_name', 'bio', 'avatar', 'password']

    def validate_password(self, value): # Валидация пароля
        password_validator(value)
        return value

    def create(self, validated_data):
        user = get_user_model().objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )
        return user