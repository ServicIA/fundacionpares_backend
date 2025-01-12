const dotenv = require('dotenv');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

dotenv.config();

const client = new SecretsManagerClient({
    region: process.env.AWS_REGION,
});

const getSecret = async (secretName) => {
    try {
        const command = new GetSecretValueCommand({ SecretId: secretName });
        const response = await client.send(command);

        if ('SecretString' in response) {
            return JSON.parse(response.SecretString);
        }

        throw new Error('El secreto no contiene datos en formato JSON');
    } catch (error) {
        console.error('Error al obtener el secreto:', error);
        throw error;
    }
};

module.exports = { getSecret };