import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Link, useNavigate } from 'react-router-dom';

import {
    registerSchema,
    type RegisterFormValues,
} from '../features/auth/authSchemas';

import { register as registerUser } from '../features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

function Register() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const error = useAppSelector((state) => state.auth.error);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormValues>({
        resolver: yupResolver(registerSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
    });

    async function onSubmit(values: RegisterFormValues) {
        try {
            await dispatch(registerUser({
                name: values.name,
                email: values.email,
                password: values.password,
            }
            )).unwrap();

            navigate('/login', {
                replace: true,
                state: { registered: true },
            });
        } catch {
            // The error is already stored in Redux.
        }
    }

    return (
        <main>
            <h1>Create a BookNest Account</h1>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div>
                    <label htmlFor="name">Full name</label>
                    <input id="name" type="text" {...register('name')} />
                    {errors.name && <p>{errors.name.message}</p>}
                </div>

                <div>
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" {...register('email')} />
                    {errors.email && <p>{errors.email.message}</p>}
                </div>

                <div>
                    <label htmlFor="password">Password</label>
                    <input id="password" type="password" {...register('password')} />
                    {errors.password && <p>{errors.password.message}</p>}
                </div>

                <div>
                    <label htmlFor="confirmPassword">Confirm password</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        {...register('confirmPassword')}
                    />
                    {errors.confirmPassword && (
                        <p>{errors.confirmPassword.message}</p>
                    )}
                </div>

                {error && <p role="alert">{error}</p>}

                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating account...' : 'Register'}
                </button>
            </form>

            <p>
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </main>
    );
}

export default Register;