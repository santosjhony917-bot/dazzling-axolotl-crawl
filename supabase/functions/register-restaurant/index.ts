// ... (código omitido)
    } else {
        // 3. Create the user using the Service Role Key (skips email confirmation)
        const { data: userData, error: userCreateError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // IMPORTANT: Automatically confirms the email
        });
// ... (código omitido)