import { IsEmail, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class LoginDto {
    @IsEmail({}, { message: 'Invalid email format' })
    email: string;

    @IsNotEmpty()
    password: string;
}

export class RegisterDto {
    @IsEmail({}, { message: 'Invalid email format' })
    email: string;

    @IsNotEmpty()
@MinLength(8, { message: 'Password must be at least 8 characters' })
@Matches(/((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]))/, { 
    message: 'Password must contain uppercase, lowercase, number and special character' 
})
password: string;

    @IsNotEmpty()
    firstName: string;

    @IsNotEmpty()
    lastName: string;

    @IsNotEmpty()
    phone: string;

    @IsNotEmpty()
    ilccsNumber: string;
}
